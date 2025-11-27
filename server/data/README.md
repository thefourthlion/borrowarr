# Indexer Base URLs Data

This directory contains the base URL mappings for each indexer. These URLs are the mirrors/proxies that users can select when configuring an indexer.

## Where This Data Comes From

Prowlarr stores indexer definitions in **Cardigann YAML files**. Each indexer definition includes a `links` array that contains all the known base URLs (mirrors/proxies) for that indexer.

### Prowlarr Indexer Definitions Location

1. **GitHub Repository**: https://github.com/Prowlarr/Indexers
   - Each indexer has a YAML file (e.g., `thepiratebay.yml`)
   - The `links` field contains the base URLs

2. **Local Prowlarr Installation**:
   - Definitions are stored in: `{AppData}/Definitions/`
   - Custom definitions: `{AppData}/Definitions/Custom/`

### Example Cardigann YAML Structure

```yaml
links:
  - https://thepiratebay.org/
  - https://thepiratebay10.xyz/
  - https://thepiratebay.unblockninja.com/
  # ... more URLs
```

## How to Extract Base URLs from Prowlarr

### Option 1: From Prowlarr's API (Recommended)

If you have a running Prowlarr instance, you can query its API:

```bash
# Get all indexer definitions
curl http://localhost:9696/api/v1/indexer/schema

# Get a specific indexer's definition
curl http://localhost:9696/api/v1/indexer/schema?implementation=Cardigann&configContract=CardigannSettings&name=thepiratebay
```

The response will include `indexerUrls` and `legacyUrls` arrays.

### Option 2: From Prowlarr's GitHub Repository

1. Clone the Prowlarr Indexers repository:
   ```bash
   git clone https://github.com/Prowlarr/Indexers.git
   ```

2. Navigate to the definitions:
   ```bash
   cd Indexers/definitions
   ```

3. Each YAML file contains a `links` array with base URLs.

### Option 3: From Cardigann Definition Files

If you have access to Prowlarr's source code:

1. Definitions are in: `Prowlarr/src/NzbDrone.Core/Indexers/Definitions/`
2. Cardigann definitions are parsed from YAML files
3. The `links` field maps to `IndexerUrls` in the code

## Adding Base URLs to This Project

1. **Manual Entry**: Edit `indexerBaseUrls.js` and add the URLs for each indexer
2. **Script Extraction**: Create a script to parse Prowlarr's YAML files and generate this file
3. **API Integration**: Fetch from Prowlarr's API at runtime (requires Prowlarr instance)

## Current Implementation

The `indexerBaseUrls.js` file contains a mapping of indexer names to their available base URLs. When an indexer is added or edited:

1. The backend looks up the indexer name in this mapping
2. Returns the list of available base URLs
3. The frontend displays them in a Select dropdown

## Future Enhancements

- **Auto-sync**: Periodically fetch updated base URLs from Prowlarr's API
- **User-submitted**: Allow users to add custom mirrors/proxies
- **Health checking**: Test each URL and prioritize working ones
- **Dynamic discovery**: Automatically discover new mirrors/proxies

