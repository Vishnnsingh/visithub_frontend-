import { z } from 'zod';
import { INDIAN_STATES } from './constants';

const mobile = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

export const accountSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name').max(80, 'Name is too long'),
    mobileNumber: mobile,
    email: z.email('Enter a valid email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const organisationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter organisation name')
    .max(120, 'Name is too long'),
  businessType: z.string().trim().min(1, 'Select a business type').max(80),
  contactNumber: mobile,
  email: z.email('Enter a valid email'),
  website: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^https?:\/\/.+/i.test(value),
      'Enter a valid URL with http:// or https://'
    ),
  addressLine1: z.string().trim().min(3, 'Enter address line 1').max(120),
  addressLine2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, 'Enter city').max(80),
  state: z.enum(INDIAN_STATES, { error: 'Select a state' }),
  country: z.string().trim().min(2, 'Enter country'),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
});

export type AccountFormValues = z.infer<typeof accountSchema>;
export type OrganisationFormValues = z.infer<typeof organisationSchema>;

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter current password'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const staffRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter a role name')
    .max(40, 'Role name is too long')
    .refine((value) => !/^(admin|administrator|super[\s_-]?admin|org[\s_-]?admin|organisation[\s_-]?admin|organization[\s_-]?admin)$/i.test(value), {
      message: 'Admin role cannot be created',
    }),
});

export type StaffRoleFormValues = z.infer<typeof staffRoleSchema>;

export const staffAccountSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter full name').max(80, 'Name is too long'),
  email: z.email('Enter a valid email'),
  phone: mobile,
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long'),
  roleId: z.string().min(1, 'Select a role'),
  allowedPages: z.array(z.string()).min(1, 'Select at least one dashboard page'),
});

export type StaffAccountFormValues = z.infer<typeof staffAccountSchema>;

export const staffEditSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter full name').max(80, 'Name is too long'),
  email: z.email('Enter a valid email'),
  phone: mobile,
  password: z
    .string()
    .max(72, 'Password is too long')
    .refine((value) => !value || value.length >= 8, 'Password must be at least 8 characters'),
  roleId: z.string().min(1, 'Select a role'),
  allowedPages: z.array(z.string()).min(1, 'Select at least one dashboard page'),
});

export type StaffEditFormValues = z.infer<typeof staffEditSchema>;
