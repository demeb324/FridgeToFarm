import { fileURLToPath } from 'url';
import { access } from 'fs/promises';
import path, { dirname } from 'path';

// Get the absolute path of this loader file and its directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Determine the project root (two levels up from this file)
const projectRoot = path.resolve(__dirname, '../../');

// List of file extensions to try appending to import specifiers
const extensions = ['.ts', '.js'];

/**
 * Custom Node.js ESM loader resolve hook.
 * Allows importing TypeScript/JavaScript files without specifying their extensions.
 * Handles both relative and absolute (project-internal) imports, including filenames with periods.
 *
 * @param {string} specifier - The module specifier being imported.
 * @param {object} context - Loader context, including parentURL.
 * @param {function} nextResolve - Function to delegate to the next resolver.
 * @returns {Promise<object>} - The resolved module or the result of nextResolve.
 */
export async function resolve(specifier, context, nextResolve) {

    // Skip resolution for:
    // - Node.js built-in modules (e.g., 'node:fs')
    // - Imports from node_modules
    // - HTTP(S) URLs
    // - Bare specifiers (e.g., 'express', '@scope/pkg')
    if (
        specifier.startsWith('node:') ||
        specifier.includes('node_modules') ||
        specifier.startsWith('http') ||
        specifier.match(/^[a-zA-Z0-9@][a-zA-Z0-9@\-_/]*$/)
    ) {
        // Delegate to Node's default resolver
        return nextResolve(specifier, context);
    }

    // If the import specifier already ends with a supported extension, do nothing special
    if (extensions.some(ext => specifier.endsWith(ext))) {
        return nextResolve(specifier, context);
    }

    // Handle relative imports (e.g., './foo', '../bar.baz')
    if (specifier.startsWith('.')) {
        // Get the directory of the importing file
        const parentPath = fileURLToPath(context.parentURL);
        const parentDir = path.dirname(parentPath);

        // Try appending each extension and check if the file exists
        for (const ext of extensions) {
            const candidate = specifier + ext;
            try {
                const resolvedPath = path.resolve(parentDir, candidate);
                await access(resolvedPath); // Throws if file does not exist
                // If found, resolve using the candidate with extension
                return nextResolve(candidate, context);
            } catch {
                // Ignore and try next extension
            }
        }
    }

    // Handle absolute (project-internal) imports (e.g., 'utils/foo')
    if (!specifier.startsWith('.') && !path.isAbsolute(specifier)) {
        // Get the directory of the importing file
        const parentPath = fileURLToPath(context.parentURL);
        const parentDir = path.dirname(parentPath);

        // Try appending each extension and check if the file exists in the project root
        for (const ext of extensions) {
            try {
                const candidate = specifier + ext;
                const resolvedPath = path.resolve(projectRoot, candidate);
                await access(resolvedPath); // Throws if file does not exist
                // Convert the resolved path to a relative path from the importing file
                const relativeToParent = path.relative(parentDir, resolvedPath);
                // Ensure the path is properly relative (starts with './' if needed)
                const properRelative = relativeToParent.startsWith('.')
                    ? relativeToParent
                    : './' + relativeToParent;
                // Resolve using the new relative path
                return nextResolve(properRelative, context);
            } catch {
                // Ignore and try next extension
            }
        }
    }

    // Fallback: use Node's default resolver if no match was found
    return nextResolve(specifier, context);
}