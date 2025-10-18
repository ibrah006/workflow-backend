import bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Organization } from '../models/Organization';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;

const userRepo = AppDataSource.getRepository(User);
const organizationRepo = AppDataSource.getRepository(Organization);


//// 
/*
JWT Structure
{
  id,
  email,
  role,
  organizationId
}
*/
////

export const registerUser = async (
    email: string,
    plainPassword: string,
    name: string,
    role?: string,
    organizationName?: string
  ) => {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
    let organization = null;
    if (organizationName) {
      organization = await organizationRepo.findOne({ where: { name: organizationName } });
      if (!organization) {
        organization = organizationRepo.create({
          name: organizationName,
          createdBy: { id: "temp" },
        });
        await organizationRepo.save(organization);
      }
    }
  
    const user = userRepo.create({
      email,
      password: hashedPassword,
      name,
      role: role || "member",
      organization,
    });
  
    await userRepo.save(user);
  
    if (organization && organization.createdBy.id === "temp") {
      organization.createdBy = user;
      await organizationRepo.save(organization);
    }
  
    return user;
  };
  
  export const loginUser = async (email: string, plainPassword: string) => {
    const user = await userRepo.findOne({
      where: { email },
      relations: ["organization"],
    });
    if (!user) throw new Error("Invalid credentials");
  
    const match = await bcrypt.compare(plainPassword, user.password);
    if (!match) throw new Error("Invalid credentials");
  
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization?.id,
      },
      JWT_SECRET,
      { expiresIn: "3d" }
    );
  
    return { token, user };
  };
  