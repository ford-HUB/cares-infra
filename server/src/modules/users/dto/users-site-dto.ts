import { z } from 'zod';
import {
  BlockUserIpSchema,
  ListUsersQuerySchema,
  ManagedUserDetailSchema,
  ManagedUserListResponseSchema,
  ManagedUserSchema,
  RestrictUserSchema,
} from '../validators/users-site-validator';

export type UserAssetKind = 'avatar' | 'signature';

export type ListUsersQueryDto = z.infer<typeof ListUsersQuerySchema>;
export type RestrictUserDto = z.infer<typeof RestrictUserSchema>;
export type BlockUserIpDto = z.infer<typeof BlockUserIpSchema>;
export type ManagedUserDto = z.infer<typeof ManagedUserSchema>;
export type ManagedUserListDto = z.infer<typeof ManagedUserListResponseSchema>;
export type ManagedUserDetailDto = z.infer<typeof ManagedUserDetailSchema>;
