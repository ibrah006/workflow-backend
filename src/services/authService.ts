import bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;

const userRepo = AppDataSource.getRepository(User);

export const registerUser = async (email: string, plainPassword: string, name: string, role?: string) => {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const user = userRepo.create({ email, password: hashedPassword, name:  name, ... role? {role: role} : {} });
    return await userRepo.save(user);
};

export const loginUser = async (email: string, plainPassword: string) => {

    // localStorage.clear(); // Removes all keys

    const user = await userRepo.findOne({ where: { email } });
    if (!user) throw new Error('Invalid credentials');

    const match = await bcrypt.compare(plainPassword, user.password);
    if (!match) throw new Error('Invalid credentials');

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        {
            expiresIn: '3d'
        });

    return { token, user };
}