import React, { useEffect, useState } from "react";
import { IAgentFlowSpec, ILLMConfig, IModelConfig, ISkill } from "../../types";
import { GroupView, ControlRowView, SkillSelector, Card } from "../../atoms";
import {
  checkAndSanitizeInput,
  fetchJSON,
  getServerUrl,
  obscureString,
  sampleAgentConfig,
  truncateText,
} from "../../utils";
import {
  Button,
  Divider,
  Dropdown,
  Input,
  MenuProps,
  Select,
  Slider,
  Space,
  Steps,
  Tabs,
  Tooltip,
  message,
  theme,
} from "antd";
import TextArea from "antd/es/input/TextArea";
import {
  BugAntIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  RectangleGroupIcon,
  Square2StackIcon,
  UserCircleIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Agent } from "undici-types";
import { set } from "js-cookie";
import { appContext } from "../../../hooks/provider";
import Modal from "antd/es/modal/Modal";

const { useToken } = theme;
const AgentTypeSelector = ({
  agent,
  setAgent,
}: {
  agent: IAgentFlowSpec | null;
  setAgent: (newAgent: IAgentFlowSpec) => void;
}) => {
  const iconClass = "h-6 w-6 inline-block ";
  const agentTypes = [
    {
      label: "User Proxy Agent",
      value: "userproxy",
      description: <>Typically represents the user and executes code. </>,
      icon: <UserCircleIcon className={iconClass} />,
    },
    {
      label: "Assistant Agent",
      value: "assistant",
      description: <>Plan and generate code to solve user tasks</>,
      icon: <CodeBracketSquareIcon className={iconClass} />,
    },
    {
      label: "GroupChat ",
      value: "groupchat",
      description: <>Manage group chat interactions</>,
      icon: <RectangleGroupIcon className={iconClass} />,
    },
  ];
  const [selectedAgentType, setSelectedAgentType] = React.useState<
    string | null
  >(null);

  const agentTypeRows = agentTypes.map((agentType: any, i: number) => {
    return (
      <li role="listitem" key={"agenttyperow" + i} className="w-36">
        <Card
          active={selectedAgentType === agentType.value}
          className="h-full p-2 cursor-pointer"
          title={<div className="  ">{agentType.label}</div>}
          onClick={() => {
            setSelectedAgentType(agentType.value);
            if (agent) {
              setAgent({ ...agent, type: agentType.value });
            }
          }}
        >
          <div style={{ minHeight: "35px" }} className="my-2   break-words">
            {" "}
            <div className="mb-2">{agentType.icon}</div>
            <span className="text-secondary  tex-sm">
              {" "}
              {agentType.description}
            </span>
          </div>
        </Card>
      </li>
    );
  });

  return (
    <>
      <div className="pb-3">Select Agent Type</div>
      <ul className="inline-flex gap-2">{agentTypeRows}</ul>
    </>
  );
};

const AgentMainView = ({
  agent,
  setAgent,
}: {
  agent: IAgentFlowSpec | null;
  setAgent: (newAgent: IAgentFlowSpec) => void;
}) => {
  return (
    <div>
      {!agent?.type && <AgentTypeSelector agent={agent} setAgent={setAgent} />}
      {agent?.type !== null && agent && (
        <AgentConfigView flowSpec={agent} setFlowSpec={setAgent} />
      )}
      <div>flowspec id {agent?.id}</div>
    </div>
  );
};

const AgentConfigView = ({
  flowSpec,
  setFlowSpec,
}: {
  flowSpec: IAgentFlowSpec;
  setFlowSpec: (newFlowSpec: IAgentFlowSpec) => void;
}) => {
  const nameValidation = checkAndSanitizeInput(flowSpec?.config?.name);
  const [error, setError] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const { user } = React.useContext(appContext);
  const serverUrl = getServerUrl();
  const createAgentUrl = `${serverUrl}/agents`;

  const onControlChange = (value: any, key: string) => {
    if (key === "llm_config") {
      if (value.config_list.length === 0) {
        value = false;
      }
    }
    const updatedFlowSpec = {
      ...flowSpec,
      config: { ...flowSpec.config, [key]: value },
    };

    setFlowSpec(updatedFlowSpec);
  };

  const createAgent = (agent: IAgentFlowSpec) => {
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

    console.log("saving agent", agent);

    const onSuccess = (data: any) => {
      if (data && data.status) {
        message.success(data.message);
        console.log("agents", data.data);
        const newAgent = data.data;
        setFlowSpec(newAgent);
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
    fetchJSON(createAgentUrl, payLoad, onSuccess, onError);
  };

  return (
    <>
      <div>
        <GroupView
          title=<div className="px-2">{flowSpec?.config?.name}</div>
          className="mb-4 bg-primary "
        >
          <ControlRowView
            title="Agent Name"
            className="mt-4"
            description="Name of the agent"
            value={flowSpec?.config?.name}
            control={
              <>
                <Input
                  className="mt-2"
                  placeholder="Agent Name"
                  value={flowSpec?.config?.name}
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
            value={flowSpec.config.description || ""}
            control={
              <Input
                className="mt-2"
                placeholder="Agent Description"
                value={flowSpec.config.description || ""}
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
            value={flowSpec.config?.max_consecutive_auto_reply}
            control={
              <Slider
                min={1}
                max={flowSpec.type === "groupchat" ? 600 : 30}
                defaultValue={flowSpec.config.max_consecutive_auto_reply}
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
            value={flowSpec.config.default_auto_reply || ""}
            control={
              <Input
                className="mt-2"
                placeholder="Agent Description"
                value={flowSpec.config.default_auto_reply || ""}
                onChange={(e) => {
                  onControlChange(e.target.value, "default_auto_reply");
                }}
              />
            }
          />

          <ControlRowView
            title="Human Input Mode"
            description="Defines when to request human input"
            value={flowSpec.config.human_input_mode}
            control={
              <Select
                className="mt-2 w-full"
                defaultValue={flowSpec.config.human_input_mode}
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

      <div className="w-full mt-4 text-right">
        {" "}
        <Button
          className=" "
          type="primary"
          onClick={() => {
            createAgent(flowSpec);
          }}
        >
          {flowSpec.id ? "Update Agent" : "Create Agent"}
        </Button>
      </div>
    </>
  );
};

export const AgentFlowSpecView = ({
  agent,
  setAgent,
}: {
  agent: IAgentFlowSpec | null;
  setAgent: (newAgent: IAgentFlowSpec) => void;
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
      items.push({
        label: (
          <div className="w-full  ">
            {" "}
            <CpuChipIcon className="h-4 w-4 inline-block mr-1" />
            Models
          </div>
        ),
        key: "2",
        children: <ModelsView id={agent?.id} />,
      });

      items.push({
        label: (
          <>
            <BugAntIcon className="h-4 w-4 inline-block mr-1" />
            Skills
          </>
        ),
        key: "3",
        children: <SkillsView id={agent?.id} />,
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

export const SkillsView = ({ id }: { id: number }) => {
  return <div> Skills </div>;
};

export const ModelSelector = ({ id }: { id: number }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [models, setModels] = useState<IModelConfig[]>([]);
  const serverUrl = getServerUrl();

  const { user } = React.useContext(appContext);
  // const listModelsUrl = `${serverUrl}/models?user_id=${user?.email}`;
  const listModelsUrl = `${serverUrl}/agents/link/model/${id}`;

  const fetchModels = () => {
    setError(null);
    setLoading(true);
    const payLoad = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const onSuccess = (data: any) => {
      if (data && data.status) {
        // message.success(data.message);
        setModels(data.data);
      } else {
        message.error(data.message);
      }
      setLoading(false);
    };
    const onError = (err: any) => {
      setError(err);
      message.error(err.message);
      setLoading(false);
    };
    fetchJSON(listModelsUrl, payLoad, onSuccess, onError);
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const modelItems: MenuProps["items"] =
    models.length > 0
      ? models.map((model: IModelConfig, index: number) => ({
          key: index,
          label: (
            <>
              <div>{model.model}</div>
              <div className="text-xs text-accent">
                {truncateText(model.description || "", 20)}
              </div>
            </>
          ),
          value: index,
        }))
      : [
          {
            key: -1,
            label: <>No models found</>,
            value: 0,
          },
        ];

  const modelOnClick: MenuProps["onClick"] = ({ key }) => {
    const selectedIndex = parseInt(key.toString());
    let selectedModel = models[selectedIndex];
    const updatedModels = [...models, selectedModel];
    setModels(updatedModels);
  };

  const menuStyle: React.CSSProperties = {
    boxShadow: "none",
  };

  const { token } = useToken();
  const contentStyle: React.CSSProperties = {
    backgroundColor: token.colorBgElevated,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowSecondary,
  };

  const addModelsMessage = (
    <span className="text-xs">
      {" "}
      <ExclamationTriangleIcon className="w-4 h-4 inline-block mr-1" /> Please
      create models in the Model tab
    </span>
  );

  const AddModelsDropDown = () => {
    return (
      <Dropdown
        menu={{ items: modelItems, onClick: modelOnClick }}
        placement="bottomRight"
        trigger={["click"]}
        dropdownRender={(menu) => (
          <div style={contentStyle}>
            {React.cloneElement(menu as React.ReactElement, {
              style: menuStyle,
            })}
            {models.length === 0 && (
              <>
                <Divider style={{ margin: 0 }} />
                <Space style={{ padding: 8 }}></Space>
                <div className="p-3">{addModelsMessage}</div>
              </>
            )}
          </div>
        )}
      >
        <div
          className="inline-flex mr-1 mb-1 p-1 px-2 rounded border hover:border-accent duration-300 hover:text-accent"
          role="button"
        >
          add <PlusIcon className="w-4 h-4 inline-block mt-1" />
        </div>
      </Dropdown>
    );
  };

  const handleRemoveModel = (index: number) => {
    // const updatedModels = models.filter((model, i) => i !== index);
    // setModels(updatedModels);
    console.log("remove model", index);
  };

  const modelButtons = models.map((model, i) => {
    const tooltipText = (
      <>
        <div>{model.model}</div>
        {model.base_url && <div>{model.base_url}</div>}
        {model.api_key && <div>{obscureString(model.api_key, 3)}</div>}
        <div className="text-xs text-accent">
          {truncateText(model.description || "", 90)}
        </div>
      </>
    );
    return (
      <div
        key={"modelrow_" + i}
        // role="button"
        className="mr-1 mb-1 p-1 px-2 rounded border"
        // onClick={() => showModal(config, i)}
      >
        <div className="inline-flex">
          {" "}
          <Tooltip title={tooltipText}>
            <div>{model.model}</div>{" "}
          </Tooltip>
          <div
            role="button"
            onClick={(e) => {
              e.stopPropagation(); // Prevent opening the modal to edit
              handleRemoveModel(i);
            }}
            className="ml-1 text-primary hover:text-accent duration-300"
          >
            <XMarkIcon className="w-4 h-4 inline-block" />
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className={""}>
      {models && models.length > 0 && (
        <>
          <div>
            {" "}
            <span className="text-accent">{models.length}</span> Models linked
            to this agent{" "}
          </div>
          <div className="flex flex-wrap">
            {modelButtons}
            <AddModelsDropDown />
          </div>
        </>
      )}
    </div>
  );
};

export const ModelsView = ({ id }: { id: number }) => {
  return (
    <div>
      {" "}
      <div>
        <ModelSelector id={id} />
      </div>
    </div>
  );
};
