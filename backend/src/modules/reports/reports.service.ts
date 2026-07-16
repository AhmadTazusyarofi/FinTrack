import { SummaryData, getSummaryData } from './reports.repository'

export async function getReportSummary(userId: string, month: number, year: number): Promise<SummaryData> {
  return getSummaryData(userId, month, year)
}
