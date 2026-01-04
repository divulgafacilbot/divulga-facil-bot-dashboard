export const getAdminToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
};

export const getAdminUser = <T = any>() => {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw =
    localStorage.getItem('admin_user') || sessionStorage.getItem('admin_user');
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    return null;
  }
};
