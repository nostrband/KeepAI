#!/bin/bash
# Usage: ./loop.sh <prompt_file> <iterations>
# Example: ./loop.sh PROMPT_build.md 5

if [ $# -ne 2 ]; then
    echo "Usage: ./loop.sh <prompt_file> <iterations>"
    exit 1
fi

PROMPT_FILE="$1"
MAX_ITERATIONS="$2"
ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Prompt: $PROMPT_FILE"
echo "Branch: $CURRENT_BRANCH"
echo "Max:    $MAX_ITERATIONS iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found"
    exit 1
fi

while [ $ITERATION -lt $MAX_ITERATIONS ]; do

    # Run Ralph iteration with selected prompt
    # -p: Headless mode (non-interactive, reads from stdin)
    # --dangerously-skip-permissions: Auto-approve all tool calls (YOLO mode)
    # --output-format=stream-json: Structured output for logging/monitoring
    # --model opus: Primary agent uses Opus for complex reasoning (task selection, prioritization)
    #               Can use 'sonnet' in build mode for speed if plan is clear and tasks well-defined
    # --verbose: Detailed execution logging
#    docker sandbox run 
    claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --model opus \
        --verbose \
        "$PROMPT_FILE"

    # Push changes after each iteration
    # git push origin "$CURRENT_BRANCH" || {
    #     echo "Failed to push. Creating remote branch..."
    #     git push -u origin "$CURRENT_BRANCH"
    # }

    ITERATION=$((ITERATION + 1))
    echo -e "\n\n======================== LOOP $ITERATION ========================\n"
done 
