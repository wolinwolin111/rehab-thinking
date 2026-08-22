export type ChiefRetestHistoryRecord = {
  chiefRetested?: boolean;
  reviewOnly?: boolean;
  afterScore: number;
};

/** 主诉复测历史只消费真实主诉复测，不把残余复查项当成新证据。 */
export function recordedChiefRetestRecords<T extends ChiefRetestHistoryRecord>(records: T[]) {
  return records.filter((record) => record.chiefRetested && !record.reviewOnly);
}

export function hasRecordedChiefRetest(records: ChiefRetestHistoryRecord[]) {
  return recordedChiefRetestRecords(records).length > 0;
}

export function latestRecordedChiefScore(records: ChiefRetestHistoryRecord[], fallback: number) {
  const chiefRecords = recordedChiefRetestRecords(records);
  return chiefRecords.length ? chiefRecords[chiefRecords.length - 1].afterScore : fallback;
}
