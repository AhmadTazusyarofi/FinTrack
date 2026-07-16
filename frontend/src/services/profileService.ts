import api from './api'

export async function updateProfileName(name: string): Promise<{ name: string }> {
  const res = await api.put<{ data: { name: string } }>('/auth/profile', { name })
  return res.data.data
}

export async function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.put('/auth/password', { currentPassword, newPassword })
}

export async function uploadAvatarFile(file: File): Promise<{ foto_profil: string }> {
  const form = new FormData()
  form.append('foto', file)
  const res = await api.post<{ data: { foto_profil: string } }>('/auth/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
}

export async function updateEmail(newEmail: string, password: string): Promise<{ email: string }> {
  const res = await api.put<{ data: { email: string } }>('/auth/email', { newEmail, password })
  return res.data.data
}

export async function deleteAccount(password: string): Promise<void> {
  await api.delete('/auth/account', { data: { password } })
}
