import {
  PilotCaseNotFoundError,
  type PilotCaseRepository,
} from "./pilot-case-contracts";
import { resolvePurgeCutoffs, type PurgeInput } from "./pilot-case-service";
import { buildPilotCaseView, publicPilotCaseRecord, type PilotCaseView, type PublicPilotCaseRecord } from "./pilot-case-view";

export class PilotCaseAdminService {
  constructor(private readonly repository: PilotCaseRepository) {}

  /** PRIV-02：按截止条件物理清除案例，返回移除数量。 */
  async purgeCases(input: PurgeInput): Promise<number> {
    const cutoffs = resolvePurgeCutoffs(input, Date.now());
    return this.repository.hardDeleteCases(cutoffs);
  }

  async listCases(): Promise<PublicPilotCaseRecord[]> {
    const cases = await this.repository.listCases();
    return cases.map(publicPilotCaseRecord);
  }

  async readCase(caseId: string): Promise<PilotCaseView> {
    const caseRecord = await this.repository.getCaseById(caseId);
    if (!caseRecord) throw new PilotCaseNotFoundError();
    const [snapshot, events, feedback] = await Promise.all([
      this.repository.getSnapshot(caseId),
      this.repository.getEventsByCaseId(caseId),
      this.repository.getFeedbackByCaseId(caseId),
    ]);
    if (!snapshot) throw new PilotCaseNotFoundError("Case snapshot not found");
    return buildPilotCaseView(caseRecord, snapshot, events, feedback);
  }

  async readCaseByPublicCode(publicCode: string): Promise<PilotCaseView> {
    const normalized = publicCode.trim();
    if (!normalized) throw new PilotCaseNotFoundError();
    const caseRecord = await this.repository.getCaseByPublicCode(normalized);
    if (!caseRecord) throw new PilotCaseNotFoundError();
    return this.readCase(caseRecord.id);
  }
}
