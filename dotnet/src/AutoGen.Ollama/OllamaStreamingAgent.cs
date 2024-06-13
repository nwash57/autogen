// Copyright (c) Microsoft Corporation. All rights reserved.
// LMStudioAgent.cs

using System.Runtime.CompilerServices;
using AutoGen.Core;
using AutoGen.OpenAI;
using AutoGen.OpenAI.Extension;
using Azure.AI.OpenAI;
using Azure.Core.Pipeline;
using Azure.Core;

#nullable enable
namespace AutoGen.LMStudio;

/// <summary>
/// agent that consumes local server from LM Studio
/// </summary>
/// <example>
/// [!code-csharp[LMStudioAgent](../../sample/AutoGen.BasicSamples/Example08_LMStudio.cs?name=lmstudio_example_1)]
/// </example>
public class OllamaStreamingAgent : IStreamingAgent
{
    private readonly OpenAIClient _openAiClient;
    private readonly GPTAgent innerAgent;
    private readonly string _modelName;
    private readonly float _temperature;
    private readonly int _maxTokens = 1024;
    private readonly IEnumerable<FunctionDefinition>? _functions;
    private readonly string _systemMessage;
    private readonly ChatCompletionsResponseFormat? _responseFormat;
    // private readonly int? _seed;

    public OllamaStreamingAgent(
        string name,
        string model,
        OllamaConfig config,
        string systemMessage = "You are a helpful AI assistant",
        float temperature = 0.7f,
        int maxTokens = 1024,
        ChatCompletionsResponseFormat? responseFormat = null,
        IEnumerable<FunctionDefinition>? functions = null,
        IDictionary<string, Func<string, Task<string>>>? functionMap = null)
    {
        _modelName = model;
        _temperature = temperature;
        _functions = functions;
        _systemMessage = systemMessage;
        _responseFormat = responseFormat;

        _openAiClient = ConfigOpenAIClientForJan(config);
        innerAgent = new GPTAgent(
            name: name,
            systemMessage: systemMessage,
            openAIClient: _openAiClient,
            modelName: model, // model name doesn't matter for LM Studio
            temperature: temperature,
            maxTokens: maxTokens,
            functions: functions,
            functionMap: functionMap);
    }

    public string Name => innerAgent.Name;

    public Task<IMessage> GenerateReplyAsync(
        IEnumerable<IMessage> messages,
        GenerateReplyOptions? options = null,
        System.Threading.CancellationToken cancellationToken = default)
    {
        return innerAgent.GenerateReplyAsync(messages, options, cancellationToken);
    }

    // public Task<IAsyncEnumerable<IStreamingMessage>> GenerateStreamingReplyAsync(IEnumerable<IMessage> messages, GenerateReplyOptions? options = null,
    //     CancellationToken cancellationToken = default)
    // {
    //     return innerAgent.GenerateStreamingReplyAsync(messages, options, cancellationToken);
    // }

    public Task<IAsyncEnumerable<IStreamingMessage>> GenerateStreamingReplyAsync(
        IEnumerable<IMessage> messages,
        GenerateReplyOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(this.StreamingReplyAsync(messages, options, cancellationToken));
    }

    private async IAsyncEnumerable<IStreamingMessage> StreamingReplyAsync(
        IEnumerable<IMessage> messages,
        GenerateReplyOptions? options = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var settings = this.CreateChatCompletionsOptions(options, messages);
        var response = await this._openAiClient.GetChatCompletionsStreamingAsync(settings);
        await foreach (var update in response.WithCancellation(cancellationToken))
        {
            if (update.ChoiceIndex > 0)
            {
                throw new InvalidOperationException("Only one choice is supported in streaming response");
            }

            yield return new MessageEnvelope<StreamingChatCompletionsUpdate>(update, from: this.Name);
        }
    }

    private ChatCompletionsOptions CreateChatCompletionsOptions(GenerateReplyOptions? options, IEnumerable<IMessage> messages)
    {
        var oaiMessages = messages.Select(m => m switch
        {
            IMessage<ChatRequestMessage> chatRequestMessage => chatRequestMessage.Content,
            _ => throw new ArgumentException("Invalid message type")
        });

        // add system message if there's no system message in messages
        if (!oaiMessages.Any(m => m is ChatRequestSystemMessage))
        {
            oaiMessages = new[] { new ChatRequestSystemMessage(_systemMessage) }.Concat(oaiMessages);
        }

        var settings = new ChatCompletionsOptions(this._modelName, oaiMessages)
        {
            MaxTokens = options?.MaxToken ?? _maxTokens,
            Temperature = options?.Temperature ?? _temperature,
            ResponseFormat = _responseFormat,
            // Seed = _seed,
        };

        var openAIFunctionDefinitions = options?.Functions?.Select(f => f.ToOpenAIFunctionDefinition());
        var functions = openAIFunctionDefinitions ?? _functions;
        if (functions is not null && functions.Count() > 0)
        {
            foreach (var f in functions)
            {
                settings.Tools.Add(new ChatCompletionsFunctionToolDefinition(f));
            }
        }

        if (options?.StopSequence is var sequence && sequence is { Length: > 0 })
        {
            foreach (var seq in sequence)
            {
                settings.StopSequences.Add(seq);
            }
        }

        return settings;
    }

    private OpenAIClient ConfigOpenAIClientForJan(OllamaConfig config)
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
