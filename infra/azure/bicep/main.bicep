@description('Deployment location')
param location string = resourceGroup().location

@description('Resource name prefix')
param prefix string = 'genie-roi'

@description('Environment name')
param env string = 'prod'

@description('Container image for API (e.g. <acr>.azurecr.io/genie-roi-api:latest)')
param apiImage string

@description('Container image for Worker (optional). Leave empty to skip worker.')
param workerImage string = ''

@description('Postgres admin username')
param pgAdminUser string = 'genie'

@secure()
@description('Postgres admin password')
param pgAdminPassword string

@description('Postgres database name')
param pgDbName string = 'genie'

@description('Custom domain for /*
  FRONT DOOR WAF Policy
*/
resource fdWaf 'Microsoft.Network/frontdoorWebApplicationFirewallPolicies@2023-05-01' = {
  name: '${name}-fd-waf'
  location: 'global'
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: 'Prevention'
      redirectUrl: ''
      customBlockResponseStatusCode: 403
    }
    managedRules: {
      managedRuleSets: [
        {
          ruleSetType: 'Microsoft_DefaultRuleSet'
          ruleSetVersion: '2.1'
        }
      ]
    }
    customRules: {
      rules: [
        {
          name: 'RateLimit'
          priority: 1
          ruleType: 'RateLimitRule'
          rateLimitDurationInMinutes: 1
          rateLimitThreshold: 2000
          action: 'Block'
          matchConditions: [
            {
              matchVariable: 'RemoteAddr'
              operator: 'IPMatch'
              matchValues: [ '0.0.0.0/0' ]
              negateCondition: false
              transforms: []
            }
          ]
        }
      ]
    }
  }
}

Front Door (optional), e.g. app.example.com')
param customDomain string = ''

@description('DNS zone resource ID for custom domain validation (optional). If omitted, you can validate manually.')
param dnsZoneResourceId string = ''

var name = '${prefix}-${env}'

/*
  LOG ANALYTICS
*/
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${name}-log'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

/*
  NETWORK (VNet + subnets for Container Apps + Private Endpoints)
*/
resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: '${name}-vnet'
  location: location
  properties: {
    addressSpace: { addressPrefixes: [ '10.60.0.0/16' ] }
    subnets: [
      {
        name: 'apps'
        properties: {
          addressPrefix: '10.60.1.0/24'
          delegations: [
            {
              name: 'containerapps-delegation'
              properties: {
                serviceName: 'Microsoft.App/environments'
              }
            }
          ]
        }
      }
      {
        name: 'private-endpoints'
        properties: {
          addressPrefix: '10.60.2.0/24'
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

resource subnetApps 'Microsoft.Network/virtualNetworks/subnets@2023-09-01' = {
  name: '${vnet.name}/apps'
  properties: vnet.properties.subnets[0].properties
}

resource subnetPe 'Microsoft.Network/virtualNetworks/subnets@2023-09-01' = {
  name: '${vnet.name}/private-endpoints'
  properties: vnet.properties.subnets[1].properties
}

/*
  KEY VAULT (RBAC) + Secrets
*/
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${name}-kv'
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: { name: 'standard' family: 'A' }
    enableRbacAuthorization: true
    enabledForDeployment: false
    enabledForTemplateDeployment: false
    enabledForDiskEncryption: false
    publicNetworkAccess: 'Disabled'
  }
}

resource kvSecretDbConn 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${kv.name}/dbConn'
  properties: { value: dbConn }
}

resource kvSecretPg 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${kv.name}/pgAdminPassword'
  properties: { value: pgAdminPassword }
}

/*
  KEY VAULT Private Link + Private DNS
*/
resource kvPrivateDns 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.vaultcore.azure.net'
  location: 'global'
}

resource kvDnsVnetLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  name: '${kvPrivateDns.name}/${name}-kv-link'
  location: 'global'
  properties: {
    virtualNetwork: { id: vnet.id }
    registrationEnabled: false
  }
}

resource kvPe 'Microsoft.Network/privateEndpoints@2023-09-01' = {
  name: '${name}-kv-pe'
  location: location
  properties: {
    subnet: { id: subnetPe.id }
    privateLinkServiceConnections: [
      {
        name: 'kv-conn'
        properties: {
          privateLinkServiceId: kv.id
          groupIds: [ 'vault' ]
        }
      }
    ]
  }
}

resource kvZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-09-01' = {
  name: '${kvPe.name}/default'
  properties: {
    privateDnsZoneConfigs: [
      { name: 'kvZone' properties: { privateDnsZoneId: kvPrivateDns.id } }
    ]
  }
  dependsOn: [ kvPe ]
}

/*
  POSTGRES Flexible Server (public access disabled) + Private DNS + Private Endpoint
*/
resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: '${name}-pg'
  location: location
  sku: { name: 'Standard_D2s_v3' tier: 'GeneralPurpose' }
  properties: {
    administratorLogin: pgAdminUser
    administratorLoginPassword: pgAdminPassword
    version: '15'
    storage: { storageSizeGB: 128 }
    network: {
      publicNetworkAccess: 'Disabled'
    }
    backup: { backupRetentionDays: 7 geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
  }
}

resource pgDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  name: '${pg.name}/${pgDbName}'
  properties: {}
}

resource privateDns 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.postgres.database.azure.com'
  location: 'global'
}

resource dnsVnetLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  name: '${privateDns.name}/${name}-link'
  location: 'global'
  properties: {
    virtualNetwork: { id: vnet.id }
    registrationEnabled: false
  }
}

resource pgPe 'Microsoft.Network/privateEndpoints@2023-09-01' = {
  name: '${name}-pg-pe'
  location: location
  properties: {
    subnet: { id: subnetPe.id }
    privateLinkServiceConnections: [
      {
        name: 'pg'
        properties: {
          privateLinkServiceId: pg.id
          groupIds: [ 'postgresqlServer' ]
        }
      }
    ]
  }
}

resource pgDnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-09-01' = {
  name: '${pgPe.name}/default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'pg'
        properties: { privateDnsZoneId: privateDns.id }
      }
    ]
  }
}

/*
  CONTAINER APPS ENVIRONMENT (VNet integrated) + Managed Identity
*/
resource cae 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${name}-cae'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: listKeys(logAnalytics.id, logAnalytics.apiVersion).primarySharedKey
      }
    }
    vnetConfiguration: {
      infrastructureSubnetId: subnetApps.id
    }
  }
}

resource idApi 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${name}-api-mi'
  location: location
}

resource idWorker 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = if (workerImage != '') {
  name: '${name}-worker-mi'
  location: location
}

/*
  SERVICE BUS (Queue)
*/
resource sb 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: '${name}-sb'
  location: location
  sku: { name: 'Standard' tier: 'Standard' }
  properties: { }
}

resource sbQueue 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  name: '${sb.name}/jobs'
  properties: {
    lockDuration: 'PT1M'
    maxDeliveryCount: 10
    enablePartitioning: true
  }
}

/*
  STORAGE (Static Website for React)
*/
resource st 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: toLower(replace('${name}web', '-', ''))
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: true
    minimumTlsVersion: 'TLS1_2'
  }
}

resource stWeb 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  name: '${st.name}/default'
  properties: {
    staticWebsite: {
      enabled: true
      indexDocument: 'index.html'
      error404Document: 'index.html'
    }
  }
}

var webHost = replace(reference(st.id, '2023-01-01').primaryEndpoints.web, 'https://', '')

resource stWebsite 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${st.name}/default/$web'
  properties: {
    publicAccess: 'Blob'
  }
}

/*
  CONTAINER APPS (API + Worker) - Key Vault Secret reference pattern (documented)
  NOTE: Container Apps can reference Key Vault secrets via managed identity and secretRef.
  Here we keep DB password as app secret for baseline; production should bind to Key Vault using secretRef.
*/
var dbHost = '${pg.name}.postgres.database.azure.com'
var dbUser = '${pgAdminUser}@${pg.name}'
var dbConn = 'postgresql://${dbUser}:${pgAdminPassword}@${dbHost}:5432/${pgDbName}?sslmode=require'

resource api 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${name}-api'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${idApi.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
      }
      secrets: [
        {
          name: 'db-conn'
          keyVaultUrl: 'https://${kv.name}.vault.azure.net/secrets/dbConn'
          identity: idApi.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          env: [
            { name: 'DATABASE_URL' secretRef: 'db-conn' }
            { name: 'APP_ENV' value: env }
          ]
          resources: { cpu: 0.5 memory: '1Gi' }
        }
      ]
      scale: {
        minReplicas: 2
        maxReplicas: 10
        rules: [
          {
            name: 'http'
            http: { metadata: { concurrentRequests: '50' } }
          }
        ]
      }
    }
  }
}

resource worker 'Microsoft.App/containerApps@2023-05-01' = if (workerImage != '') {
  name: '${name}-worker'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${idWorker.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      secrets: [
        {
          name: 'db-conn'
          keyVaultUrl: 'https://${kv.name}.vault.azure.net/secrets/dbConn'
          identity: idApi.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'worker'
          image: workerImage
          env: [
            { name: 'DATABASE_URL' secretRef: 'db-conn' }
            { name: 'APP_ENV' value: env }
          ]
          resources: { cpu: 0.5 memory: '1Gi' }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
      }
    }
  }
}

/*
  FRONT DOOR Standard/Premium (Managed certificate + custom domain) and routing:
  - / -> Storage static website
  - /api/* -> Container Apps API
*/
resource fdProfile 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: '${name}-fd'
  location: 'global'
  sku: { name: 'Standard_AzureFrontDoor' }
}

resource fdEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2023-05-01' = {
  name: '${fdProfile.name}/${name}-ep'
  location: 'global'
  properties: { enabledState: 'Enabled' }
}

/*
  Front Door Security Policy (attach WAF)
*/
resource fdSecurity 'Microsoft.Cdn/profiles/securityPolicies@2023-05-01' = {
  name: '${fd.name}/${name}-sec'
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: { id: fdWaf.id }
      associations: [
        {
          domains: [
            { id: fdEndpoint.id }
          ]
          patternsToMatch: [ '/*' ]
        }
      ]
    }
  }
  dependsOn: [ fdWaf ]
}

resource fdOriginGroupWeb 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  name: '${fdProfile.name}/web-og'
  properties: {
    loadBalancingSettings: { sampleSize: 4 successfulSamplesRequired: 3 }
    healthProbeSettings: { probePath: '/' probeRequestType: 'GET' probeProtocol: 'Https' probeIntervalInSeconds: 120 }
  }
}

resource fdOriginWeb 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  name: '${fdOriginGroupWeb.name}/web'
  properties: {
    hostName: webHost
    httpPort: 80
    httpsPort: 443
    originHostHeader: webHost
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
  }
}

resource fdOriginGroupApi 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  name: '${fdProfile.name}/api-og'
  properties: {
    loadBalancingSettings: { sampleSize: 4 successfulSamplesRequired: 3 }
    healthProbeSettings: { probePath: '/v379/health' probeRequestType: 'GET' probeProtocol: 'Https' probeIntervalInSeconds: 120 }
  }
}

resource fdOriginApi 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  name: '${fdOriginGroupApi.name}/api'
  properties: {
    hostName: api.properties.configuration.ingress.fqdn
    httpPort: 80
    httpsPort: 443
    originHostHeader: api.properties.configuration.ingress.fqdn
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
  }
}

resource fdRouteWeb 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  name: '${fdEndpoint.name}/web'
  properties: {
    originGroup: { id: fdOriginGroupWeb.id }
    supportedProtocols: [ 'Http', 'Https' ]
    patternsToMatch: [ '/*' ]
    forwardingProtocol: 'HttpsOnly'
    httpsRedirect: 'Enabled'
    linkToDefaultDomain: 'Enabled'
  }
}

resource fdRouteApi 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  name: '${fdEndpoint.name}/api'
  properties: {
    originGroup: { id: fdOriginGroupApi.id }
    supportedProtocols: [ 'Http', 'Https' ]
    patternsToMatch: [ '/api/*', '/v379/*', '/v380/*' ]
    forwardingProtocol: 'HttpsOnly'
    httpsRedirect: 'Enabled'
    linkToDefaultDomain: 'Enabled'
  }
}

resource fdCustomDomain 'Microsoft.Cdn/profiles/customDomains@2023-05-01' = if (customDomain != '') {
  name: '${fdProfile.name}/custom'
  properties: {
    hostName: customDomain
    tlsSettings: {
      certificateType: 'ManagedCertificate'
      minimumTlsVersion: 'TLS12'
    }
  }
}

resource fdDomainAssociation 'Microsoft.Cdn/profiles/customDomains/afdEndpoints@2023-05-01' = if (customDomain != '') {
  name: '${fdCustomDomain.name}/${name}-ep'
  properties: {
    afdEndpointId: fdEndpoint.id
  }
}

output frontDoorEndpoint string = fdEndpoint.properties.hostName
output apiFqdn string = api.properties.configuration.ingress.fqdn
output postgresServer string = pg.name
