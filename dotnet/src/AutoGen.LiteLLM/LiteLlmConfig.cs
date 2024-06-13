// Copyright (c) Microsoft Corporation. All rights reserved.

using AutoGen.Core;

namespace AutoGen.LiteLLM;

/// <summary>
/// Add support for consuming openai-like API from LM Studio
/// </summary>
public class LiteLlmConfig : ILLMConfig
{
    public LiteLlmConfig(
        string host,
        int port,
        string model,
        float temp = 0F,
        int version = 1)
    {
        this.Host = host;
        this.Port = port;
        this.Model = model;
        this.Temperature = temp;
        this.Version = version;
    }

    public string Host { get; }

    public int Port { get; }

    public int Version { get; }

    public string Model { get; }

    public float Temperature { get; }

    public Uri Uri => new Uri($"http://{Host}:{Port}/v{Version}");
}
