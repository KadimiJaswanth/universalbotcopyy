import type { RequestHandler } from "express";
import { spawn } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";

// Template for integrating Python scripts
export const handlePythonScript: RequestHandler = async (req, res) => {
  try {
    const { script, input_data, args = [] } = req.body;
    
    if (!script) {
      res.status(400).json({ error: "Missing Python script" });
      return;
    }

    // Create temporary Python file
    const tempFile = join(process.cwd(), `temp_script_${Date.now()}.py`);
    writeFileSync(tempFile, script);

    // Prepare arguments for Python execution
    const pythonArgs = [tempFile, ...args];
    
    // Execute Python script
    const pythonProcess = spawn('python3', pythonArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    // Send input data to Python script if provided
    if (input_data) {
      pythonProcess.stdin.write(JSON.stringify(input_data));
      pythonProcess.stdin.end();
    }

    // Collect output
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      // Clean up temporary file
      try {
        unlinkSync(tempFile);
      } catch {}

      if (code === 0) {
        try {
          // Try to parse output as JSON, fallback to string
          const result = JSON.parse(output);
          res.json({ success: true, result });
        } catch {
          res.json({ success: true, result: output.trim() });
        }
      } else {
        res.status(500).json({ 
          success: false, 
          error: `Python script failed with code ${code}`,
          stderr: error,
          stdout: output
        });
      }
    });

    // Handle timeout (30 seconds)
    setTimeout(() => {
      pythonProcess.kill();
      try {
        unlinkSync(tempFile);
      } catch {}
      res.status(408).json({ error: "Python script execution timeout" });
    }, 30000);

  } catch (error) {
    console.error('Python integration error:', error);
    res.status(500).json({ error: "Failed to execute Python script" });
  }
};

// Alternative: Convert Python to JavaScript/TypeScript
export const convertPythonToJS = (pythonCode: string): string => {
  // Basic Python to JavaScript conversion patterns
  let jsCode = pythonCode
    // Convert print statements
    .replace(/print\((.*?)\)/g, 'console.log($1)')
    // Convert def to function
    .replace(/def\s+(\w+)\s*\((.*?)\):/g, 'function $1($2) {')
    // Convert if statements
    .replace(/if\s+(.*?):/g, 'if ($1) {')
    // Convert elif to else if
    .replace(/elif\s+(.*?):/g, '} else if ($1) {')
    // Convert else
    .replace(/else:/g, '} else {')
    // Convert for loops (basic)
    .replace(/for\s+(\w+)\s+in\s+range\((\d+)\):/g, 'for (let $1 = 0; $1 < $2; $1++) {')
    // Add closing braces (this is simplified)
    .replace(/\n(\s*)(.*)/g, '\n$1$2');
  
  return `// Converted from Python\n${jsCode}\n// Note: This is a basic conversion. Manual review recommended.`;
};
