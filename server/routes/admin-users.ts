import {Request, Response, Router} from 'express';
import {requireAdmin} from '../middleware/auth-middleware';
import * as fs from 'fs/promises';
import {SERVER_CONFIG} from '../config';
import apacheMd5 from 'apache-md5';

const router = Router();

// POST /api/admin/users - create new user
router.post('/', requireAdmin, async (req: Request, res: Response) => {
    try {
        const {username, password, role} = req.body;

        // validate inputs
        if (!username || !password || !role) {
            return res.status(400).json({error: 'missing required fields: username, password, role'});
        }

        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({error: 'username and password must be strings'});
        }

        if (role !== 'admin' && role !== 'user') {
            return res.status(400).json({error: 'role must be "admin" or "user"'});
        }

        // validate username (alphanumeric, underscore, hyphen only)
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            return res.status(400).json({error: 'username can only contain letters, numbers, underscore, and hyphen'});
        }

        // check if user already exists
        try {
            const htpasswdContent = await fs.readFile(SERVER_CONFIG.htpasswdPath, 'utf-8');
            const lines = htpasswdContent.split('\n');
            for (const line of lines) {
                const [existingUser] = line.split(':');
                if (existingUser === username) {
                    return res.status(409).json({error: 'user already exists'});
                }
            }
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
            // file doesn't exist, will be created
        }

        // hash password using APR1 (Apache MD5)
        const hashedPassword = apacheMd5(password);

        // append to htpasswd file
        const htpasswdEntry = `${username}:${hashedPassword}\n`;
        await fs.appendFile(SERVER_CONFIG.htpasswdPath, htpasswdEntry, 'utf-8');

        // update groups file
        try {
            let groupsContent = '';
            try {
                groupsContent = await fs.readFile(SERVER_CONFIG.groupsPath, 'utf-8');
            } catch (error: any) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }

            const lines = groupsContent.split('\n').filter((l) => l.trim());
            const groupName = role === 'admin' ? SERVER_CONFIG.adminGroup : 'user';
            let groupUpdated = false;

            // find and update the group line
            for (let i = 0; i < lines.length; i++) {
                const [group, members] = lines[i].split(':').map((s) => s.trim());
                if (group === groupName) {
                    const memberList = members ? members.split(',').map((m) => m.trim()) : [];
                    if (!memberList.includes(username)) {
                        memberList.push(username);
                    }
                    lines[i] = `${groupName}: ${memberList.join(', ')}`;
                    groupUpdated = true;
                    break;
                }
            }

            // if group doesn't exist, create it
            if (!groupUpdated) {
                lines.push(`${groupName}: ${username}`);
            }

            await fs.writeFile(SERVER_CONFIG.groupsPath, lines.join('\n') + '\n', 'utf-8');
        } catch (error) {
            // rollback htpasswd entry if groups update failed
            try {
                const content = await fs.readFile(SERVER_CONFIG.htpasswdPath, 'utf-8');
                const updatedContent = content.replace(htpasswdEntry, '');
                await fs.writeFile(SERVER_CONFIG.htpasswdPath, updatedContent, 'utf-8');
            } catch {
                // ignore rollback errors
            }
            throw error;
        }

        console.log(`user created: ${username} with role: ${role}`);
        res.status(201).json({message: 'user created successfully', username, role});
    } catch (error) {
        console.error('error creating user:', error);
        res.status(500).json({error: 'failed to create user'});
    }
});

// GET /api/admin/users - list all users
router.get('/', requireAdmin, async (req: Request, res: Response) => {
    try {
        const htpasswdContent = await fs.readFile(SERVER_CONFIG.htpasswdPath, 'utf-8');
        const groupsContent = await fs.readFile(SERVER_CONFIG.groupsPath, 'utf-8');

        // parse groups
        const groupLines = groupsContent.split('\n').filter((l) => l.trim());
        const userGroups: Map<string, string[]> = new Map();

        for (const line of groupLines) {
            const [groupName, members] = line.split(':').map((s) => s.trim());
            if (members) {
                const memberList = members.split(',').map((m) => m.trim());
                for (const member of memberList) {
                    if (!userGroups.has(member)) {
                        userGroups.set(member, []);
                    }
                    userGroups.get(member)!.push(groupName);
                }
            }
        }

        // parse users
        const htpasswdLines = htpasswdContent.split('\n').filter((l) => l.trim());
        const users = htpasswdLines.map((line) => {
            const [username] = line.split(':');
            const groups = userGroups.get(username) || [];
            const role = groups.includes(SERVER_CONFIG.adminGroup) ? 'admin' : 'user';
            return {username, role, groups};
        });

        res.json({users});
    } catch (error: any) {
        console.error('error listing users:', error);
        if (error.code === 'ENOENT') {
            return res.json({users: []});
        }
        res.status(500).json({error: 'failed to list users'});
    }
});

// DELETE /api/admin/users/:username - remove user
router.delete('/:username', requireAdmin, async (req: Request, res: Response) => {
    try {
        const {username} = req.params;

        if (!username) {
            return res.status(400).json({error: 'username is required'});
        }

        // remove from htpasswd file
        let htpasswdContent = await fs.readFile(SERVER_CONFIG.htpasswdPath, 'utf-8');
        const htpasswdLines = htpasswdContent.split('\n');
        const filteredHtpasswd = htpasswdLines.filter((line) => {
            const [user] = line.split(':');
            return user !== username;
        });

        if (filteredHtpasswd.length === htpasswdLines.length) {
            return res.status(404).json({error: 'user not found'});
        }

        await fs.writeFile(SERVER_CONFIG.htpasswdPath, filteredHtpasswd.join('\n'), 'utf-8');

        // remove from groups file
        try {
            let groupsContent = await fs.readFile(SERVER_CONFIG.groupsPath, 'utf-8');
            const groupLines = groupsContent.split('\n');
            const updatedGroups = groupLines.map((line) => {
                if (!line.includes(':')) {
                    return line;
                }
                const [groupName, members] = line.split(':').map((s) => s.trim());
                if (!members) {
                    return line;
                }
                const memberList = members.split(',').map((m) => m.trim());
                const filteredMembers = memberList.filter((m) => m !== username);
                if (filteredMembers.length === 0) {
                    return `${groupName}:`;
                }
                return `${groupName}: ${filteredMembers.join(', ')}`;
            });

            await fs.writeFile(SERVER_CONFIG.groupsPath, updatedGroups.join('\n'), 'utf-8');
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error('error updating groups file:', error);
            }
        }

        console.log(`user deleted: ${username}`);
        res.json({message: 'user deleted successfully'});
    } catch (error: any) {
        console.error('error deleting user:', error);
        if (error.code === 'ENOENT') {
            return res.status(404).json({error: 'user file not found'});
        }
        res.status(500).json({error: 'failed to delete user'});
    }
});

export default router;
