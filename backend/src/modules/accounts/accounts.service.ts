import { AccountRow, findAccountsByUserId, createAccount, updateAccount, deleteAccount } from './accounts.repository'

export async function getAccounts(userId: string): Promise<AccountRow[]> {
  return findAccountsByUserId(userId)
}

export async function createAccountService(userId: string, name: string, balance: number): Promise<AccountRow> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Nama akun wajib diisi')
  try {
    return await createAccount(userId, trimmed, balance)
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') throw new Error('Akun dengan nama ini sudah ada')
    throw err
  }
}

export async function updateAccountService(id: string, userId: string, name: string, balance: number): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Nama akun wajib diisi')
  try {
    await updateAccount(id, userId, trimmed, balance)
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') throw new Error('Akun dengan nama ini sudah ada')
    throw err
  }
}

export async function deleteAccountService(id: string, userId: string): Promise<void> {
  try {
    await deleteAccount(id, userId)
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'ER_ROW_IS_REFERENCED_2') {
      throw new Error('Akun ini masih memiliki transaksi yang terkait')
    }
    throw err
  }
}
