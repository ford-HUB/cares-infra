import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { RoleType } from '../prisma/common/enums';
import { PrismaService } from '../prisma/prisma-service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type UploadedFile = {
  fieldname: string;
  originalname: string;
  buffer: Buffer;
  mimetype: string;
};

@Injectable()
export class AuthService {
  private readonly uploadsDir = join(process.cwd(), 'uploads');

  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto, files: UploadedFile[]) {
    await this.ensureRoles();

    const existing = await this.prisma.account.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    if (dto.accountType === 'beneficiary') {
      if (!dto.beneficiaryType) {
        throw new BadRequestException('Beneficiary type is required.');
      }
      if (
        dto.beneficiaryType === 'organizationMember' &&
        !dto.organizationName?.trim()
      ) {
        throw new BadRequestException('Organization name is required.');
      }
      if (!dto.dateOfBirth || !dto.gender || !dto.address?.trim()) {
        throw new BadRequestException(
          'Date of birth, gender, and address are required for beneficiaries.',
        );
      }
    } else {
      if (!dto.userRole) {
        throw new BadRequestException('User role is required.');
      }
      if (!dto.schoolIdNumber?.trim()) {
        throw new BadRequestException('School ID number is required.');
      }
      if (!dto.department || !dto.course || !dto.yearLevel) {
        throw new BadRequestException(
          'Academic information is required for regular users.',
        );
      }
    }

    const schoolIdFile = this.findFile(files, 'schoolIdImage');
    const selfieFile = this.findFile(files, 'selfieImage');
    const faceFile = this.findFile(files, 'facePicture');

    if (dto.accountType === 'regularUser') {
      if (!schoolIdFile || !selfieFile) {
        throw new BadRequestException(
          'School ID and selfie images are required.',
        );
      }
    } else if (!faceFile) {
      throw new BadRequestException('Face picture is required.');
    }

    const roleType =
      dto.accountType === 'beneficiary'
        ? RoleType.BENEFICIARY
        : RoleType.VOLUNTEER;

    const role = await this.prisma.role.findFirst({
      where: { type: roleType },
    });
    if (!role) {
      throw new BadRequestException('Required role is not configured.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const schoolIdUrl = schoolIdFile
      ? await this.saveFile(schoolIdFile, 'school-id')
      : null;
    const selfieUrl = selfieFile
      ? await this.saveFile(selfieFile, 'selfie')
      : null;
    const faceUrl = faceFile ? await this.saveFile(faceFile, 'face') : null;

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          firstname: dto.firstName.trim(),
          lastname: dto.lastName.trim(),
          role_id: role.role_id,
          profile: {
            create: {
              middlename: dto.middleName?.trim() || null,
              phone: dto.phoneNumber.trim(),
              school_id_number: dto.schoolIdNumber?.trim() || null,
              department: dto.department || null,
              course: dto.course || null,
              year_level: dto.yearLevel || null,
              date_of_birth: dto.dateOfBirth
                ? new Date(dto.dateOfBirth)
                : null,
              gender: dto.gender || null,
              address: dto.address?.trim() || null,
              organization_name: dto.organizationName?.trim() || null,
              account_type: dto.accountType,
              beneficiary_type: dto.beneficiaryType || null,
              user_role: dto.userRole || null,
            },
          },
          accounts: {
            create: {
              email: dto.email.toLowerCase().trim(),
              password: passwordHash,
            },
          },
        },
        include: {
          accounts: true,
          profile: true,
        },
      });

      if (schoolIdUrl) {
        await tx.userVerification.create({
          data: {
            user_id: createdUser.user_id,
            school_id_url: schoolIdUrl,
          },
        });
      }

      const profileImageUrl = selfieUrl ?? faceUrl;
      if (profileImageUrl) {
        await tx.user.update({
          where: { user_id: createdUser.user_id },
          data: { avatar: profileImageUrl },
        });
      }

      return createdUser;
    });

    return {
      message: 'Registration successful. You can now log in.',
      userId: user.user_id,
      email: user.accounts[0]?.email,
    };
  }

  async login(dto: LoginDto) {
    const account = await this.prisma.account.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: {
        user: {
          include: {
            role: true,
            profile: true,
          },
        },
      },
    });

    if (!account) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordValid = await bcrypt.compare(dto.password, account.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return {
      message: 'Login successful.',
      user: {
        userId: account.user.user_id,
        email: account.email,
        firstName: account.user.firstname,
        lastName: account.user.lastname,
        role: account.user.role.type,
        accountType: account.user.profile?.account_type,
      },
    };
  }

  private findFile(files: UploadedFile[], fieldname: string) {
    return files.find((file) => file.fieldname === fieldname);
  }

  private async saveFile(file: UploadedFile, prefix: string) {
    await mkdir(this.uploadsDir, { recursive: true });
    const extension = file.originalname.includes('.')
      ? file.originalname.substring(file.originalname.lastIndexOf('.'))
      : '.jpg';
    const filename = `${prefix}-${randomUUID()}${extension}`;
    const absolutePath = join(this.uploadsDir, filename);
    await writeFile(absolutePath, file.buffer);
    return `/uploads/${filename}`;
  }

  private async ensureRoles() {
    const roleTypes = Object.values(RoleType);
    for (const type of roleTypes) {
      const existing = await this.prisma.role.findFirst({ where: { type } });
      if (!existing) {
        await this.prisma.role.create({ data: { type } });
      }
    }
  }
}
