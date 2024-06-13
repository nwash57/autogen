// Copyright (c) Microsoft Corporation. All rights reserved.
// LMStudioAgent.cs

#nullable enable
using AutoGen.Core;
using AutoGen.OpenAI;
using Azure.AI.OpenAI;
using Azure.Core;
using Azure.Core.Pipeline;

namespace AutoGen.Jan;

/// <summary>
/// agent that consumes local server from LM Studio
/// </summary>
/// <example>
/// [!code-csharp[LMStudioAgent](../../sample/AutoGen.BasicSamples/Example08_LMStudio.cs?name=lmstudio_example_1)]
/// </example>
public class OllamaAgent : IAgent
{
    private readonly GPTAgent innerAgent;

    public OllamaAgent(
        string name,
        string model,
        OllamaConfig config,
        string systemMessage = "You are a helpful AI assistant",
        float temperature = 0.7f,
        int maxTokens = 1024,
        IEnumerable<FunctionDefinition>? functions = null,
        IDictionary<string, Func<string, Task<string>>>? functionMap = null)
    {
        var client = ConfigOpenAIClientForOllama(config);
        innerAgent = new GPTAgent(
            name: name,
            systemMessage: systemMessage,
            openAIClient: client,
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

    private OpenAIClient ConfigOpenAIClientForOllama(OllamaConfig config)
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
