export interface ActivityEvent {
  type:       string;
  agentName?: string;
  model?:     string;
  message:    string;
  tokenUsed?: number;
  durationMs?: number;
  timestamp:  number;
}