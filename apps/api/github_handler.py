import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

# Map the tool names defined in the frontend to GitHub MCP server tool names.
TOOL_ALIASES = {
    "get_repo": "get_repository",
    "list_issues": "list_issues",
    "search_repositories": "search_repositories",
}


async def call_github_tool(tool_name: str, args: dict) -> str:
    mcp_tool = TOOL_ALIASES.get(tool_name, tool_name)

    server_params = StdioServerParameters(
        command="npx",
        args=["-y", "@github/mcp-server"],
        env={
            "GITHUB_PERSONAL_ACCESS_TOKEN": GITHUB_TOKEN,
            "PATH": os.environ.get("PATH", ""),
        },
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool(mcp_tool, args)
            if result.content:
                return result.content[0].text
            return ""
