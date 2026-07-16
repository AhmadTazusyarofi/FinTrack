import { AccountRow, findAccountsByUserId } from './accounts.repository'

export async function getAccounts(userId: string): Promise<AccountRow[]> {
  return findAccountsByUserId(userId)
}
