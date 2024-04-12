import React from "react";
import { GroupView, ControlRowView } from "../../../atoms";
import { checkAndSanitizeInput, fetchJSON, getServerUrl } from "../../../utils";
import {
  Button,
  Form,
  Input,
  Select,
  Slider,
  Tabs,
  message,
  theme,
} from "antd";
import {
  BugAntIcon,
  CpuChipIcon,
  InformationCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { appContext } from "../../../../hooks/provider";
import {
  AgentSelector,
  AgentTypeSelector,
  ModelSelector,
  SkillSelector,
} from "./selectors";
import { IAgent } from "../../../types";

const { useToken } = theme;

export const AgentConfigView = ({
  agent,
  setAgent,
}: {
  agent: IAgent;
  setAgent: (agent: IAgent) => void;
}) => {
  const nameValidation = checkAndSanitizeInput(agent?.config?.name);
  const [error, setError] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const { user } = React.useContext(appContext);
  const serverUrl = getServerUrl();
  const createAgentUrl = `${serverUrl}/agents`;
  const [controlChanged, setControlChanged] = React.useState<boolean>(false);

  const onControlChange = (value: any, key: string) => {
    if (key === "llm_config") {
      if (value.config_list.length === 0) {
        value = false;
      }
    }
    const updatedAgent = {
      ...agent,
      config: { ...agent.config, [key]: value },
    };

    setAgent(updatedAgent);
    setControlChanged(true);
  };

  const createAgent = (agent: IAgent) => {
    setError(null);
    setLoading(true);
    // const fetch;
    agent.user_id = user?.email;

    const payLoad = {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(agent),
    };

    const onSuccess = (data: any) => {
      if (data && data.status) {
        message.success(data.message);
        console.log("agents", data.data);
        const newAgent = data.data;
        setAgent(newAgent);
        // setAgents(data.data);
      } else {
        message.error(data.message);
      }
      setLoading(false);
      // setNewAgent(sampleAgent);
    };
    const onError = (err: any) => {
      setError(err);
      message.error(err.message);
      setLoading(false);
    };
    const onFinal = () => {
      setLoading(false);
      setControlChanged(false);
    };

    fetchJSON(createAgentUrl, payLoad, onSuccess, onError, onFinal);
  };

  const hasChanged =
    (!controlChanged || !nameValidation.status) && agent?.id !== undefined;

  return (
    <>
      <Form
        onValuesChange={(changedValues, allValues) => {
          console.log("changedValues", changedValues);
          console.log("allValues", allValues);
        }}
      >
        <div>
          <GroupView
            title=<div className="px-2">{agent?.config?.name}</div>
            className="mb-4 bg-primary "
          >
            <ControlRowView
              title="Agent Name"
              className="mt-4"
              description="Name of the agent"
              value={agent?.config?.name}
              control={
                <>
                  <Input
                    className="mt-2"
                    placeholder="Agent Name"
                    value={agent?.config?.name}
                    onChange={(e) => {
                      onControlChange(e.target.value, "name");
                    }}
                  />
                  {!nameValidation.status && (
                    <div className="text-xs text-red-500 mt-2">
                      {nameValidation.message}
                    </div>
                  )}
                </>
              }
            />

            <ControlRowView
              title="Agent Description"
              className="mt-4"
              description="Description of the agent, used by other agents
        (e.g. the GroupChatManager) to decide when to call upon this agent. (Default: system_message)"
              value={agent.config.description || ""}
              control={
                <Input
                  className="mt-2"
                  placeholder="Agent Description"
                  value={agent.config.description || ""}
                  onChange={(e) => {
                    onControlChange(e.target.value, "description");
                  }}
                />
              }
            />

            <ControlRowView
              title="Max Consecutive Auto Reply"
              className="mt-4"
              description="Max consecutive auto reply messages before termination."
              value={agent.config?.max_consecutive_auto_reply}
              control={
                <Slider
                  min={1}
                  max={agent.type === "groupchat" ? 600 : 30}
                  defaultValue={agent.config.max_consecutive_auto_reply}
                  step={1}
                  onChange={(value: any) => {
                    onControlChange(value, "max_consecutive_auto_reply");
                  }}
                />
              }
            />

            <ControlRowView
              title="Agent Default Auto Reply"
              className="mt-4"
              description="Default auto reply when no code execution or llm-based reply is generated."
              value={agent.config.default_auto_reply || ""}
              control={
                <Input
                  className="mt-2"
                  placeholder="Agent Description"
                  value={agent.config.default_auto_reply || ""}
                  onChange={(e) => {
                    onControlChange(e.target.value, "default_auto_reply");
                  }}
                />
              }
            />

            <ControlRowView
              title="Human Input Mode"
              description="Defines when to request human input"
              value={agent.config.human_input_mode}
              control={
                <Select
                  className="mt-2 w-full"
                  defaultValue={agent.config.human_input_mode}
                  onChange={(value: any) => {
                    onControlChange(value, "human_input_mode");
                  }}
                  options={
                    [
                      { label: "NEVER", value: "NEVER" },
                      // { label: "TERMINATE", value: "TERMINATE" },
                      // { label: "ALWAYS", value: "ALWAYS" },
                    ] as any
                  }
                />
              }
            />
          </GroupView>
        </div>
      </Form>
      <div className="w-full mt-4 text-right">
        {" "}
        <Button
          className={`${hasChanged ? "opacity-50" : ""} `}
          type="primary"
          onClick={() => {
            createAgent(agent);
          }}
          loading={loading}
          disabled={hasChanged}
        >
          {agent.id ? "Update Agent" : "Create Agent"}
        </Button>
      </div>
    </>
  );
};

export const AgentMainView = ({
  agent,
  setAgent,
}: {
  agent: IAgent | null;
  setAgent: (newAgent: IAgent) => void;
}) => {
  return (
    <div>
      {!agent?.type && <AgentTypeSelector agent={agent} setAgent={setAgent} />}

      {/* {agent && agent.id && (
        <div className="border p-2 text-xs rounded ">
          {" "}
          <InformationCircleIcon className="h-4 w-4 inline-block mr-1" /> You
          can add models and skills to your agent.
        </div>
      )} */}
      {agent?.type && agent && (
        <AgentConfigView agent={agent} setAgent={setAgent} />
      )}
    </div>
  );
};

export const AgentFlowSpecView = ({
  agent,
  setAgent,
}: {
  agent: IAgent | null;
  setAgent: (newAgent: IAgent) => void;
}) => {
  let items = [
    {
      label: (
        <div className="w-full  ">
          {" "}
          <BugAntIcon className="h-4 w-4 inline-block mr-1" />
          Agent Configuration
        </div>
      ),
      key: "1",
      children: <AgentMainView agent={agent} setAgent={setAgent} />,
    },
  ];
  if (agent) {
    if (agent?.id) {
      if (agent.type && agent.type === "groupchat") {
        items.push({
          label: (
            <div className="w-full  ">
              {" "}
              <UserGroupIcon className="h-4 w-4 inline-block mr-1" />
              Agents
            </div>
          ),
          key: "2",
          children: <AgentSelector agentId={agent?.id} />,
        });
      }

      items.push({
        label: (
          <div className="w-full  ">
            {" "}
            <CpuChipIcon className="h-4 w-4 inline-block mr-1" />
            Models
          </div>
        ),
        key: "3",
        children: <ModelSelector agentId={agent?.id} />,
      });

      items.push({
        label: (
          <>
            <BugAntIcon className="h-4 w-4 inline-block mr-1" />
            Skills
          </>
        ),
        key: "4",
        children: <SkillSelector agentId={agent?.id} />,
      });
    }
  }

  return (
    <>
      {/* <RenderView viewIndex={currentViewIndex} /> */}
      <Tabs
        tabBarStyle={{ paddingLeft: 0, marginLeft: 0 }}
        defaultActiveKey="1"
        items={items}
      />
    </>
  );
};
