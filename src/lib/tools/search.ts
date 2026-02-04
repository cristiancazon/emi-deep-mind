
export const searchTools = [
    {
        name: "search_google",
        description: "Performs a general Google Web Search to find information.",
        parameters: {
            type: "OBJECT",
            properties: {
                query: {
                    type: "STRING",
                    description: "The search query."
                }
            },
            required: ["query"]
        }
    }
];

export async function searchGoogle(query: string) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;

    if (!apiKey || !cx) {
        throw new Error("Google Search is not configured (Missing API Key or CX).");
    }

    try {
        const response = await fetch(`https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Google Search API Error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            return "No results found for your query.";
        }

        // Format results for the model
        const results = data.items.slice(0, 5).map((item: any) => {
            return `* [${item.title}](${item.link})\n  ${item.snippet}`;
        }).join("\n\n");

        return `Top Google Search Results:\n\n${results}`;

    } catch (error: any) {
        console.error("Google Search Error:", error);
        throw new Error(`Failed to perform search: ${error.message}`);
    }
}
