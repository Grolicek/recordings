import {NextFunction, Request, Response} from 'express';
import * as fs from 'fs';
import * as crypto from 'crypto';
import {SERVER_CONFIG} from '../config';

export interface AuthUser {
    username: string;
    role: 'admin' | 'user';
}

// parse htpasswd file and verify credentials
function verifyHtpasswd(username: string, password: string): boolean {
    try {
        const htpasswdContent = fs.readFileSync(SERVER_CONFIG.htpasswdPath, 'utf-8');
        const lines = htpasswdContent.split('\n');

        for (const line of lines) {
            const [user, hash] = line.split(':');
            if (user === username) {
                // support APR1 (Apache MD5) format
                if (hash.startsWith('$apr1$')) {
                    return verifyApr1(password, hash);
                }
                // support bcrypt format
                if (hash.startsWith('$2y$') || hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
                    console.warn('bcrypt format detected but not fully supported');
                    return false;
                }
            }
        }
    } catch (error) {
        console.error('failed to read htpasswd file:', error);
    }
    return false;
}

// verify APR1 (Apache MD5) password hash
function verifyApr1(password: string, hash: string): boolean {
    const parts = hash.split('$');
    if (parts.length !== 4 || parts[1] !== 'apr1') {
        return false;
    }

    const salt = parts[2];
    const expectedHash = parts[3];

    // apache md5 algorithm
    let ctx = crypto.createHash('md5');
    ctx.update(password + '$apr1$' + salt);

    let ctx1 = crypto.createHash('md5');
    ctx1.update(password + salt + password);
    let final = ctx1.digest();

    for (let pl = password.length; pl > 0; pl -= 16) {
        ctx.update(final.subarray(0, pl > 16 ? 16 : pl));
    }

    for (let i = password.length; i; i >>= 1) {
        if (i & 1) {
            ctx.update(Buffer.from([0]));
        } else {
            ctx.update(Buffer.from([password.charCodeAt(0)]));
        }
    }

    final = ctx.digest();

    for (let i = 0; i < 1000; i++) {
        const ctx2 = crypto.createHash('md5');
        if (i & 1) {
            ctx2.update(password);
        } else {
            ctx2.update(final);
        }
        if (i % 3) {
            ctx2.update(salt);
        }
        if (i % 7) {
            ctx2.update(password);
        }
        if (i & 1) {
            ctx2.update(final);
        } else {
            ctx2.update(password);
        }
        final = ctx2.digest();
    }

    const computed = to64(final);
    return computed === expectedHash;
}

// convert hash to base64 (apache format)
function to64(buffer: Buffer): string {
    const itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    const indices = [0, 6, 12, 1, 7, 13, 2, 8, 14, 3, 9, 15, 4, 10, 5, 11];

    for (let i = 0; i < 5; i++) {
        const idx = i * 3;
        const v = (buffer[indices[idx]] << 16) | (buffer[indices[idx + 1]] << 8) | buffer[indices[idx + 2]];
        for (let j = 0; j < 4; j++) {
            result += itoa64[(v >> (j * 6)) & 0x3f];
        }
    }
    const v = buffer[indices[15]];
    result += itoa64[v & 0x3f];
    result += itoa64[(v >> 6) & 0x3f];

    return result;
}

// get user role from groups file
function getUserRole(username: string): 'admin' | 'user' {
    try {
        const groupsContent = fs.readFileSync(SERVER_CONFIG.groupsPath, 'utf-8');
        const lines = groupsContent.split('\n');

        for (const line of lines) {
            const [groupName, members] = line.split(':').map((s) => s.trim());
            if (members && members.split(',').map((m) => m.trim()).includes(username)) {
                if (groupName === SERVER_CONFIG.adminGroup) {
                    return 'admin';
                }
            }
        }
    } catch (error) {
        console.error('failed to read groups file:', error);
    }
    return 'user';
}

// authenticate user from Basic Auth header
function authenticateUser(req: Request): AuthUser | null {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return null;
    }

    try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    if (!verifyHtpasswd(username, password)) {
        return null;
    }

        const role = getUserRole(username);
        return {username, role};
    } catch (error) {
        console.error('error during authentication:', error);
        return null;
    }
}

// middleware: requires any authenticated user
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const user = authenticateUser(req);

    if (!user) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Recordings API"');
        return res.status(401).json({error: 'authentication required'});
    }

    (req as any).user = user;
    next();
}

// middleware: requires admin role
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const user = authenticateUser(req);

    if (!user) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Recordings API"');
        return res.status(401).json({error: 'authentication required'});
    }

    if (user.role !== 'admin') {
        return res.status(403).json({error: 'admin access required'});
    }

    (req as any).user = user;
    next();
}

// middleware: attaches user if authenticated, allows anonymous
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
    const user = authenticateUser(req);
    if (user) {
        (req as any).user = user;
    }
    next();
}
