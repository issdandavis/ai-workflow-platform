from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent, tool

app = BedrockAgentCoreApp()

@tool
def get_weather(location: str) -> str:
    """Get weather information for a location."""
    # This is a mock weather tool for demonstration
    return f"The weather in {location} is sunny and 72°F"

@tool
def calculate_tip(bill_amount: float, tip_percentage: float = 15.0) -> str:
    """Calculate tip amount for a bill."""
    tip = bill_amount * (tip_percentage / 100)
    total = bill_amount + tip
    return f"Bill: ${bill_amount:.2f}, Tip ({tip_percentage}%): ${tip:.2f}, Total: ${total:.2f}"

@app.entrypoint
async def invoke(payload, context):
    """Main entrypoint for the agent."""
    user_message = payload.get("prompt", "Hello!")
    
    # Create agent with tools
    agent = Agent(
        model="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        tools=[get_weather, calculate_tip]
    )
    
    # Process the request
    response = await agent.invoke_async(user_message)
    
    return {"response": str(response.message)}

if __name__ == "__main__":
    app.run()