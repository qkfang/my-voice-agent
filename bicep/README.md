# Bicep – Azure AI Foundry

Provisions an **Azure OpenAI** resource and a **gpt-4o-realtime-preview** model deployment.

## Deploy

```bash
az group create --name rg-voice-agent --location eastus
az deployment group create \
  --resource-group rg-voice-agent \
  --template-file main.bicep \
  --parameters name=voice-agent-oai
```

The deployment outputs `endpoint` and `resourceName`.  
Use these to populate `AZURE_OPENAI_ENDPOINT` in `apps/api/.env`.
