import { AppRequest } from '../models';

/**
 * @param {AppRequest} request
 * @returns {string}
 */
export function getUserIdFromRequest(request: AppRequest): string {
  return request.user && request.user.id;
}

export function isAdmin(request: AppRequest): boolean {
  return request.user && request.user.is_admin;
}

