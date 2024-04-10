export type NotificationType = "success" | "info" | "warning" | "error";

export interface IMessage {
  user_id: string;
  role: string;
  content: string;
  created_at?: string;
  updated_at?: string;
  session_id?: number;
  connection_id?: string;
  workflow_id?: number;
}

export interface IStatus {
  message: string;
  status: boolean;
  data?: any;
}

export interface IChatMessage {
  text: string;
  sender: "user" | "bot";
  metadata?: any;
  msg_id: string;
}

export interface ILLMConfig {
  config_list: Array<IModelConfig>;
  timeout?: number;
  cache_seed?: number | null;
  temperature: number;
}

export interface IAgentConfig {
  name: string;
  llm_config?: ILLMConfig | false;
  human_input_mode: string;
  max_consecutive_auto_reply: number;
  system_message: string | "";
  is_termination_msg?: boolean | string;
  default_auto_reply?: string | null;
  code_execution_config?: boolean | string | { [key: string]: any } | null;
  description?: string;
}

export interface IAgentFlowSpec {
  type?: "assistant" | "userproxy" | "groupchat";
  config: IAgentConfig;
  created_at?: string;
  updated_at?: string;
  id?: number;
  skills?: Array<ISkill>;
  user_id?: string;
}

export interface IGroupChatConfig {
  agents: Array<IAgentFlowSpec>;
  admin_name: string;
  messages: Array<any>;
  max_round: number;
  speaker_selection_method: "auto" | "round_robin" | "random";
  allow_repeat_speaker: boolean | Array<IAgentConfig>;
}

export interface IGroupChatFlowSpec {
  type: "groupchat";
  config: IAgentConfig;
  groupchat_config: IGroupChatConfig;
  id?: number;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  description?: string;
}

export interface IFlowConfig {
  name: string;
  description: string;
  sender: IAgentFlowSpec;
  receiver: IAgentFlowSpec | IGroupChatFlowSpec;
  type: "twoagents" | "groupchat";
  created_at?: string;
  updated_at?: string;
  summary_method?: "none" | "last" | "llm";
  id?: number;
  user_id?: string;
}

export interface IModelConfig {
  model: string;
  api_key?: string;
  api_version?: string;
  base_url?: string;
  api_type?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
  id?: number;
}

export interface IMetadataFile {
  name: string;
  path: string;
  extension: string;
  content: string;
  type: string;
}

export interface IChatSession {
  id?: number;
  user_id: string;
  workflow_id?: number;
  created_at?: string;
  updated_at?: string;
  name: string;
}

export interface IGalleryItem {
  id: number;
  messages: Array<IMessage>;
  session: IChatSession;
  tags: Array<string>;
  created_at: string;
  updated_at: string;
}

export interface ISkill {
  name: string;
  content: string;
  id?: string;
  description?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}
