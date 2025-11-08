import bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Organization } from '../models/Organization';
import { getEmailDomain, isPrivateDomainEmail } from '../utils/email';

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
  ) => {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
    // let organization = await organizationRepo.findOne({ where: { name: organizationName } });
    // if (!organization) {
    //   organization = organizationRepo.create({
    //       name: organizationName,
    //       createdBy: { id: "temp" },
    //   });
    //   await organizationRepo.save(organization);
    // }
  
    const user = userRepo.create({
      email,
      password: hashedPassword,
      name,
      role: role || "member"
    });
  
    const savedUser = await userRepo.save(user);
  
    // if (organization.createdBy.id === "temp") {
    //   organization.createdBy = user;
    //   await organizationRepo.save(organization);
    // }
  
    return savedUser;
  };
  
  export const loginUser = async (email: string, plainPassword?: string, jwtToken?: string) => {

    if (!plainPassword && !jwtToken) {
      // Either password or jwt token must be passed in for logging in
      throw "Password must be passed in for logging in";
    }

    const user = await userRepo.findOne({
      where: { email },
      relations: ["organization"],
    });
    if (!user) throw new Error("Invalid credentials");
  
    let match;
    if (plainPassword) {
      match = await bcrypt.compare(plainPassword, user.password);
    } else if (jwtToken) {
      // If JWT token is passed in, then we surely reached this path after getting through authMiddleware
      match = true;
    }

    if (!match) throw new Error("Invalid credentials");
  
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization?.id,
      },
      JWT_SECRET,
      { expiresIn: "99d" }
    );
  
    return { token, user };
  };
  
export const autoInviteOrganizationFrom = async (organizationId: string | undefined, email: string) : Promise<any | null> => {
  let autoInviteOrganization = null;

  // Check to see if user is part of any organization
  if (!organizationId) {
    // if user is not part of any organization
    // Check to see if the user's email domain is private
    if (isPrivateDomainEmail(email)) {
        // Get user's private domain
        const userEmailDomain = getEmailDomain(email)!;

        console.log("user email private domain:", userEmailDomain);

        // Check to see if there is any existing organization with this user's private domain
        const existingOrganizationWithSamePrivateDomain = await organizationRepo.findOne({
            where: {
                privateDomain: userEmailDomain
            },
            relations: ['createdBy', 'users', 'projects', 'companies']
        });

        console.log("existingOrganizationWithSamePrivateDomain:", existingOrganizationWithSamePrivateDomain);
        
        if (existingOrganizationWithSamePrivateDomain) {
            autoInviteOrganization = {
                ...existingOrganizationWithSamePrivateDomain,
                createdBy: { id: existingOrganizationWithSamePrivateDomain.createdBy.id },
                // Omit password fields
                users: existingOrganizationWithSamePrivateDomain.users.map((user) => {
                    return {
                        ...user,
                        password: undefined
                    }
                })
            }
        }
    }
  }

  return autoInviteOrganization;
}