
export const tasksTools = [
    {
        name: "list_task_lists",
        description: "Lists the user's task lists to find the correct list ID.",
        parameters: {
            type: "OBJECT",
            properties: {
                maxResults: {
                    type: "NUMBER",
                    description: "Maximum number of task lists to return (default 10)."
                }
            },
            required: []
        }
    },
    {
        name: "list_tasks",
        description: "Lists tasks from a specific task list.",
        parameters: {
            type: "OBJECT",
            properties: {
                tasklist: {
                    type: "STRING",
                    description: "The ID of the task list to list tasks from (optional, defaults to primary)."
                },
                showCompleted: {
                    type: "BOOLEAN",
                    description: "Whether to include completed tasks."
                },
                maxResults: {
                    type: "NUMBER",
                    description: "Maximum number of tasks to return (default 20)."
                }
            },
            required: []
        }
    },
    {
        name: "add_task",
        description: "Creates a new task in a task list.",
        parameters: {
            type: "OBJECT",
            properties: {
                title: {
                    type: "STRING",
                    description: "The title of the task."
                },
                notes: {
                    type: "STRING",
                    description: "Additional notes or description for the task."
                },
                due: {
                    type: "STRING",
                    description: "Due date in RFC 3339 format (YYYY-MM-DDThh:mm:ssZ)."
                },
                tasklist: {
                    type: "STRING",
                    description: "The ID of the task list to add to (optional, defaults to primary)."
                }
            },
            required: ["title"]
        }
    },
    {
        name: "complete_task",
        description: "Marks a task as completed.",
        parameters: {
            type: "OBJECT",
            properties: {
                tasklist: {
                    type: "STRING",
                    description: "The ID of the task list (optional, defaults to primary)."
                },
                taskId: {
                    type: "STRING",
                    description: "The ID of the task to complete."
                }
            },
            required: ["taskId"]
        }
    }
];

export async function listTaskLists(accessToken: string, maxResults: number = 10) {
    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=${maxResults}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    if (!res.ok) throw new Error(`Google Tasks API Error: ${res.statusText}`);
    const data = await res.json();
    return data.items || [];
}

export async function listTasks(accessToken: string, tasklist: string = '@default', showCompleted: boolean = false, maxResults: number = 20) {
    let url = `https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks?maxResults=${maxResults}`;
    if (showCompleted) {
        url += '&showCompleted=true&showHidden=true';
    } else {
        url += '&showCompleted=false'; // Only active tasks by default
    }

    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    if (!res.ok) throw new Error(`Google Tasks API Error: ${res.statusText}`);
    const data = await res.json();
    return data.items || [];
}

export async function addTask(accessToken: string, { title, notes, due, tasklist = '@default' }: { title: string, notes?: string, due?: string, tasklist?: string }) {
    const body: any = { title };
    if (notes) body.notes = notes;
    if (due) body.due = due;

    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Google Tasks API Error Details:", JSON.stringify(errorData, null, 2));
        throw new Error(`Google Tasks API Error: ${res.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }
    return await res.json();
}

export async function completeTask(accessToken: string, taskId: string, tasklist: string = '@default') {
    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: 'completed'
        })
    });

    if (!res.ok) throw new Error(`Google Tasks API Error: ${res.statusText}`);
    return await res.json();
}
