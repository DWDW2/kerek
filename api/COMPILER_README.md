# Compiler API

This module provides a secure code compilation and execution service similar to the Easy-Compiler-API, but implemented in Rust with enhanced security features.

## Supported Languages

- **C++** (.cpp) - Compiled with g++
- **C** (.c) - Compiled with gcc
- **Python** (.py) - Interpreted with python3
- **Java** (.java) - Compiled with javac, executed with java
- **JavaScript** (.js) - Executed with node

## API Endpoints

### POST `/api/compiler/compile`

Compile and execute code.

**Request Body:**

```json
{
  "language": "python",
  "code": "print('Hello, World!')",
  "input": "optional input string",
  "timeout": 10
}
```

**Response:**

```json
{
  "success": true,
  "output": "Hello, World!\n",
  "error": null,
  "execution_time": 125
}
```

### GET `/api/compiler/languages`

Get list of supported programming languages.

**Response:**

```json
[
  {
    "name": "Python",
    "key": "python",
    "file_extension": ".py",
    "supports_compilation": false,
    "supports_input": true
  }
]
```

### POST `/api/run-code` (Legacy Endpoint)

Legacy endpoint for compatibility with existing frontend.

**Request Body:**

```json
{
  "language": "python",
  "code": "print('Hello World')",
  "input": ""
}
```

## Security Features

### Code Validation

- Maximum code size: 10KB
- Maximum execution time: 10 seconds
- Maximum output size: 1MB

### Forbidden Patterns

The following patterns are blocked for security:

- `system(`, `exec(`, `eval(`
- `import os`, `import subprocess`
- File operations: `open(`, `file(`
- System calls and process execution

### Resource Limits

- Execution runs in isolated temporary directories
- Limited environment variables
- Automatic cleanup after execution
- Timeout protection

## Usage Examples

### Python Hello World

```bash
curl -X POST http://localhost:8080/api/compiler/compile \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "print(\"Hello, World!\")"
  }'
```

### C++ with Input

```bash
curl -X POST http://localhost:8080/api/compiler/compile \
  -H "Content-Type: application/json" \
  -d '{
    "language": "cpp",
    "code": "#include <iostream>\nusing namespace std;\nint main() {\n    string name;\n    cin >> name;\n    cout << \"Hello, \" << name << endl;\n    return 0;\n}",
    "input": "Alice"
  }'
```

### Java Example

```bash
curl -X POST http://localhost:8080/api/compiler/compile \
  -H "Content-Type: application/json" \
  -d '{
    "language": "java",
    "code": "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}"
  }'
```

## System Requirements

The following tools must be installed on the system:

- **g++** - For C++ compilation
- **gcc** - For C compilation
- **python3** - For Python execution
- **javac & java** - For Java compilation and execution
- **node** - For JavaScript execution

## Error Handling

The API returns detailed error messages for:

- Compilation errors
- Runtime errors
- Security violations
- Timeout errors
- System errors

## Testing

Run the test suite:

```bash
cd api
cargo test compiler::handler::tests
```

## Implementation Notes

- Uses async/await for non-blocking execution
- Temporary files are automatically cleaned up
- Each execution runs in an isolated workspace
- Java class names are automatically extracted from code
- Supports both compiled and interpreted languages

This implementation provides a robust, secure alternative to the original Node.js Easy-Compiler-API with enhanced safety features and better resource management.
