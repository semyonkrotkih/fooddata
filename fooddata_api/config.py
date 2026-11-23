import os

APP_ENV = os.getenv("APP_ENV", "development")
IS_PRODUCTION = APP_ENV.lower() == "production"

if IS_PRODUCTION:
    from azure.identity import DefaultAzureCredential
    from azure.keyvault.secrets import SecretClient

    vault_url = os.environ["KEY_VAULT_URL"]
    credential = DefaultAzureCredential()
    client = SecretClient(
        vault_url=vault_url,
        credential=credential
    )
    EXPO_PUBLIC_API_URL = client.get_secret("expo-public-api-url").value
    SQL_CONNECTION_STRING = client.get_secret("sql-connection-string").value
    ANTHROPIC_API_KEY = client.get_secret("anthropic-api-key").value

else:
    EXPO_PUBLIC_API_URL = os.environ["EXPO_PUBLIC_API_URL"]
    SQL_CONNECTION_STRING = os.environ["SQL_CONNECTION_STRING"]
    ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]