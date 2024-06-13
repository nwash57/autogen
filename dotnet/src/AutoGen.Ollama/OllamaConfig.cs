// Copyright (c) Microsoft Corporation. All rights reserved.
// LMStudioConfig.cs

using AutoGen.Core;

/// <summary>
/// Add support for consuming openai-like API from LM Studio
/// </summary>
public class OllamaConfig : ILLMConfig
{
    public OllamaConfig(
        string host,
        int port,
        string model = "llamacorn-1.1b",
        int version = 1)
    {
        this.Host = host;
        this.Port = port;
        this.Model = model;
        this.Version = version;
    }

    public string Host { get; }

    public int Port { get; }

    public int Version { get; }

    public string Model { get; }

    public Uri Uri => new Uri($"http://{Host}:{Port}/v{Version}");
}
