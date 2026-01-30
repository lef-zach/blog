// Polyfill for TextEncoder/TextDecoder if needed (Node < 20 often needs it for some libs)
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Fetch
global.fetch = jest.fn();

// Mock LocalStorage
const localStorageMock = (function () {
    let store = {};
    return {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn(key => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        })
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});
