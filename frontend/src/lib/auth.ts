import { RoleName, User } from '../types';

export function hasPermission(user: User, allowedRoles: RoleName[]): boolean {
    if (!user.role) return false;
    return allowedRoles.includes(user.role.name);
}

export const ROLE_PERMISSIONS = {
    VIEW_INVENTORY: ['Administrator', 'Finance Director', 'IT Specialist', 'Property Manager'] as RoleName[],
    MANAGE_ASSETS: ['Administrator', 'IT Specialist'] as RoleName[],
    APPROVE_PURCHASES: ['Administrator', 'Finance Director'] as RoleName[],
    GENERATE_REPORTS: ['Administrator', 'Finance Director', 'Property Manager'] as RoleName[],
};
