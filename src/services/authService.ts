import bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;

const userRepo = AppDataSource.getRepository(User);

export const registerUser = async (email: string, plainPassword: string) => {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const user = userRepo.create({ email, password: hashedPassword });
    return await userRepo.save(user);
};

export const loginUser = async (email: string, plainPassword: string) => {
    const user = await userRepo.findOne({ where: { email } });
    if (!user) throw new Error('Invalid credentials');

    const match = await bcrypt.compare(plainPassword, user.password);
    if (!match) throw new Error('Invalid credentials');

    const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        {
            expiresIn: '1d'
        });

    return { token, user };
}