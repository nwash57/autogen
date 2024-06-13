// Copyright (c) Microsoft Corporation. All rights reserved.

#nullable enable
using AutoGen.Core;
using AutoGen.OpenAI;
using Azure.AI.OpenAI;
using Azure.Core;
using Azure.Core.Pipeline;

namespace AutoGen.LiteLLM;

/// <summary>
/// agent that consumes local server from LM Studio
/// </summary>
/// <example>
/// [!code-csharp[LMStudioAgent](../../sample/AutoGen.BasicSamples/Example08_LMStudio.cs?name=lmstudio_example_1)]
/// </example>
public class LiteLlmStreamingAgent : IStreamingAgent
{
    private readonly OpenAIClient _openAiClient;
    private readonly OpenAIChatAgent _innerAgent;
    private readonly string _modelName;
    private readonly float _temperature;
    // private readonly int _maxTokens = 1024;
    private readonly IEnumerable<FunctionDefinition>? _functions;
    private readonly string _systemMessage;
    private readonly ChatCompletionsResponseFormat? _responseFormat;

    private readonly IDictionary<string, Func<string, Task<string>>>? _functionMap;
    private readonly int? _seed;

    public LiteLlmStreamingAgent(
        string name,
        LiteLlmConfig config,
        string systemMessage = "You are a helpful AI assistant",
        int maxTokens = 1024,
        int? seed = null,
        ChatCompletionsResponseFormat? responseFormat = null,
        IEnumerable<FunctionDefinition>? functions = null,
        IDictionary<string, Func<string, Task<string>>>? functionMap = null)
    {
        _modelName = config.Model;
        _temperature = config.Temperature;
        _functions = functions;
        _systemMessage = systemMessage;
        _seed = seed;
        _responseFormat = responseFormat;
        _functionMap = functionMap;

        _openAiClient = ConfigOpenAIClientForLiteLlm(config);
        _innerAgent = new OpenAIChatAgent(
            _openAiClient,
            name,
            config.Model,
            systemMessage,
            temperature: config.Temperature,
            maxTokens: maxTokens,
            seed,
            responseFormat,
            functions: functions);
    }

    public string Name => _innerAgent.Name;

    public async Task<IMessage> GenerateReplyAsync(
        IEnumerable<IMessage> messages,
        GenerateReplyOptions? options = null,
        System.Threading.CancellationToken cancellationToken = default)
    {
        var oaiConnectorMiddleware = new OpenAIChatRequestMessageConnector();
        var agent = this._innerAgent.RegisterMiddleware(oaiConnectorMiddleware);
        if (this._functionMap is not null)
        {
            var functionMapMiddleware = new FunctionCallMiddleware(functionMap: this._functionMap);
            agent = agent.RegisterMiddleware(functionMapMiddleware);
        }

        var result = await agent.GenerateReplyAsync(messages, options, cancellationToken);

        return result;
    }

    public async Task<IAsyncEnumerable<IStreamingMessage>> GenerateStreamingReplyAsync(
        IEnumerable<IMessage> messages,
        GenerateReplyOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var oaiConnectorMiddleware = new OpenAIChatRequestMessageConnector();
        var agent = this._innerAgent.RegisterStreamingMiddleware(oaiConnectorMiddleware);
        if (this._functionMap is not null)
        {
            var functionMapMiddleware = new FunctionCallMiddleware(functionMap: this._functionMap);
            agent = agent.RegisterStreamingMiddleware(functionMapMiddleware);
        }

        return await agent.GenerateStreamingReplyAsync(messages, options, cancellationToken);
    }

    private OpenAIClient ConfigOpenAIClientForLiteLlm(LiteLlmConfig config)
    {
        // create uri from host and port
        var uri = config.Uri;
        var accessToken = new AccessToken(string.Empty, DateTimeOffset.Now.AddDays(180));
        var tokenCredential = DelegatedTokenCredential.Create((_, _) => accessToken);
        var openAIClient = new OpenAIClient(uri, tokenCredential);

        // remove authenication header from pipeline
        var pipeline = HttpPipelineBuilder.Build(
            new OpenAIClientOptions(OpenAIClientOptions.ServiceVersion.V2022_12_01),
            Array.Empty<HttpPipelinePolicy>(),
            [],
            new ResponseClassifier());

        // use reflection to override _pipeline field
        var field = typeof(OpenAIClient).GetField("_pipeline", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);

        if (field is null)
        {
            throw new NullReferenceException("failed to get _pipeline field");
        }

        field.SetValue(openAIClient, pipeline);

        // use reflection to set _isConfiguredForAzureOpenAI to false
        var isConfiguredForAzureOpenAIField = typeof(OpenAIClient).GetField("_isConfiguredForAzureOpenAI", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        if (isConfiguredForAzureOpenAIField is null)
        {
            throw new NullReferenceException("failed to get _isConfiguredForAzureOpenAI field");
        }

        isConfiguredForAzureOpenAIField.SetValue(openAIClient, false);

        return openAIClient;
    }
}
