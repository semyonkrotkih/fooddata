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
    EXPO_PUBLIC_API_URL = client.get_secret("EXPO_PUBLIC_API_URL").value
    SQL_CONNECTION_STRING = client.get_secret("SQL_CONNECTION_STRING").value
    ANTHROPIC_API_KEY = client.get_secret("ANTHROPIC_API_KEY").value

else:
    EXPO_PUBLIC_API_URL = os.environ["EXPO_PUBLIC_API_URL"]
    SQL_CONNECTION_STRING = os.environ["SQL_CONNECTION_STRING"]
    ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]