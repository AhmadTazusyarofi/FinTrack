import { SummaryData, getSummaryData } from './reports.repository'
import { resolvePeriod } from '../periods/periods.service'

export async function getReportSummary(userId: string, month?: number, year?: number): Promise<SummaryData> {
  return getSummaryData(userId, await resolvePeriod(userId, month, year))
}
