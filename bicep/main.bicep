@description('Base name for all resources')
param name string

@description('Azure region')
param location string = resourceGroup().location

@description('Model deployment name')
param modelName string = 'gpt-4o-realtime-preview'

@description('Model version')
param modelVersion string = '2024-10-01'

module aiServices 'modules/ai-services.bicep' = {
  name: 'deploy-ai-services'
  params: {
    name: name
    location: location
    modelName: modelName
    modelVersion: modelVersion
  }
}

output endpoint string = aiServices.outputs.endpoint
output resourceName string = aiServices.outputs.resourceName
