import React from 'react';

interface PrivacyPolicyProps {
  onClose: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-policy-title"
    >
      <div 
        className="bg-gray-800 text-gray-300 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 id="privacy-policy-title" className="text-xl font-semibold text-white">Privacy Policy</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            aria-label="Close privacy policy"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto prose prose-invert prose-sm max-w-none">
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
          
          <p>Welcome to ChatVerse. Your privacy is important to us. This Privacy Policy explains how we handle your information when you use our application.</p>

          <h3>1. Information We Collect</h3>
          <p>ChatVerse is designed with privacy in mind. We do not have our own servers, and we do not collect any personally identifiable information from you.</p>
          <ul>
            <li><strong>Chat History:</strong> Your conversation history is stored directly on your device in your web browser's <code>localStorage</code>. This data is not transmitted to, or stored on, any servers we control. You have full control over this data and can clear it at any time by clearing your browser's site data.</li>
            <li><strong>API Key:</strong> This application requires a Google Gemini API key to function. The key is managed by the environment you are running the application in and is used solely to make requests to the Google Gemini API on your behalf. We do not store or transmit your API key.</li>
          </ul>

          <h3>2. How We Use Information</h3>
          <p>The information handled by the application is used solely for the following purposes:</p>
          <ul>
            <li>To provide and maintain the core functionality of the chat application.</li>
            <li>To send your prompts to the Google Gemini API to receive responses.</li>
            <li>To store your conversation history locally on your device for your convenience.</li>
          </ul>

          <h3>3. Third-Party Services</h3>
          <p>ChatVerse interacts with the following third-party service:</p>
          <ul>
            <li><strong>Google Gemini API:</strong> All your conversations are processed by Google's Gemini models. Your interactions are subject to Google's Privacy Policy. We encourage you to review it to understand how Google handles your data. You can find it at <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a>.</li>
          </ul>

          <h3>4. Data Security</h3>
          <p>Since all sensitive data (chat history) is stored on your local device, the security of that data is dependent on the security of your own computer and browser. No method of transmission over the internet or method of electronic storage is 100% secure.</p>
          
          <h3>5. Children's Privacy</h3>
          <p>Our service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from children under 13.</p>

          <h3>6. Changes to This Privacy Policy</h3>
          <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.</p>

          <h3>7. Contact Us</h3>
          <p>If you have any questions about this Privacy Policy, please contact us through the platform where you accessed this application.</p>
        </div>
      </div>
    </div>
  );
};
