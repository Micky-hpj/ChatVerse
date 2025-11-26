import React, { useState, useMemo } from 'react';
import { StarIcon, QrCodeIcon, CopyIcon, CheckIcon } from './Icons';

interface PaymentModalProps {
  onClose: () => void;
  onConfirm: (months: number) => void;
  upiId: string;
}

interface Plan {
    months: number;
    price: number;
    name: string;
    description: string;
}

const plans: Plan[] = [
    { months: 1, price: 50, name: "1 Month", description: "₹50" },
    { months: 3, price: 120, name: "3 Months", description: "₹120 (Save 20%)" },
    { months: 6, price: 210, name: "6 Months", description: "₹210 (Save 30%)" },
];

const MOCK_VALID_TXN_ID = 'TXNPRO2024SUCCESS';

/**
 * Simulates a backend API call to verify a transaction ID.
 * In a real application, this would be a fetch() call to your server.
 * @param id The transaction ID to verify.
 * @returns A promise that resolves if the ID is valid, and rejects otherwise.
 */
const verifyTransactionIdApi = (id: string): Promise<{ success: true }> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (id.trim().toUpperCase() === MOCK_VALID_TXN_ID) {
                resolve({ success: true });
            } else {
                reject({ message: "Transaction ID not found. Please double-check the ID from your payment app and try again." });
            }
        }, 2500); // Simulate network delay
    });
};


export const PaymentModal: React.FC<PaymentModalProps> = ({ onClose, onConfirm, upiId }) => {
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [copied, setCopied] = useState(false);
    const [transactionId, setTransactionId] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationError, setVerificationError] = useState<string | null>(null);


    const qrCodeUrl = useMemo(() => {
        if (!selectedPlan) return '';
        const upiData = new URLSearchParams({
            pa: upiId,
            pn: 'ChatVerse',
            am: selectedPlan.price.toString(),
            cu: 'INR',
            tn: `ChatVerse Pro ${selectedPlan.months} Month(s)`,
        });
        const upiString = `upi://pay?${upiData.toString()}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
    }, [selectedPlan, upiId]);

    const handleCopyUpi = () => {
        navigator.clipboard.writeText(upiId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleConfirm = async () => {
        if (!selectedPlan || isVerifying || !transactionId.trim()) return;

        setVerificationError(null);
        setIsVerifying(true);

        try {
            await verifyTransactionIdApi(transactionId);
            // If the promise resolves, the ID is valid.
            onConfirm(selectedPlan.months);
        } catch (error: any) {
            // If the promise rejects, the ID is invalid.
            setVerificationError(error.message || "An unknown verification error occurred.");
        } finally {
            setIsVerifying(false);
        }
    };
    
    const handleTransactionIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTransactionId(e.target.value);
        if (verificationError) {
            setVerificationError(null); // Clear error when user types
        }
    };
    
    const isConfirmDisabled = isVerifying || transactionId.trim().length === 0;
    
    const renderPlanSelection = () => (
        <>
            <div className="p-6 text-center space-y-4">
                <p className="text-gray-300">
                    Choose a plan to get unlimited messages, priority access, and more.
                </p>
                <div className="grid grid-cols-1 gap-4 pt-2">
                    {plans.map((plan) => (
                        <button
                            key={plan.months}
                            onClick={() => setSelectedPlan(plan)}
                            className="p-4 border-2 border-gray-600 rounded-lg text-left hover:border-blue-500 hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all"
                        >
                            <h3 className="font-bold text-white">{plan.name}</h3>
                            <p className="text-sm text-gray-400">{plan.description}</p>
                        </button>
                    ))}
                </div>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-b-lg">
                <button
                    onClick={onClose}
                    className="w-full text-center py-2 text-sm text-gray-400 hover:text-white"
                >
                    Maybe later
                </button>
            </div>
        </>
    );

    const renderPaymentDetails = () => (
        <>
            <div className="p-6 space-y-4 text-center">
                <p className="text-sm">
                    Complete the payment for the <span className="font-bold text-white">{selectedPlan?.name}</span> plan for <span className="font-bold text-white">₹{selectedPlan?.price}</span>.
                </p>

                <div className="flex flex-col items-center gap-4 p-4 bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-gray-400">Scan the QR code with your UPI app</p>
                    {qrCodeUrl ? (
                         <img src={qrCodeUrl} alt="UPI QR Code" className="rounded-lg bg-white p-2" />
                    ) : (
                        <div className="w-[216px] h-[216px] bg-gray-700 animate-pulse rounded-lg flex items-center justify-center">
                            <QrCodeIcon className="w-10 h-10 text-gray-500" />
                        </div>
                    )}
                   
                    <p className="text-xs text-gray-400">or pay to the UPI ID below</p>
                    <div className="relative w-full">
                        <input
                            type="text"
                            value={upiId}
                            readOnly
                            className="w-full bg-gray-700 text-center text-white border border-gray-600 rounded-lg p-3 pr-10 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                         <button onClick={handleCopyUpi} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white transition-colors">
                            {copied ? <CheckIcon className="h-5 w-5 text-green-400" /> : <CopyIcon className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div className="text-center text-xs text-yellow-400 bg-yellow-900/50 p-3 rounded-lg border border-yellow-700/60">
                    After payment, enter the Transaction ID. <br /> For this demo, use: <strong>{MOCK_VALID_TXN_ID}</strong>
                </div>

                <div>
                    <label htmlFor="txnId" className="sr-only">UPI Transaction ID</label>
                    <input
                        id="txnId"
                        type="text"
                        value={transactionId}
                        onChange={handleTransactionIdChange}
                        placeholder="Enter Transaction ID"
                        className={`w-full bg-gray-700 text-white border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-500 transition-colors ${verificationError ? 'border-red-500' : 'border-gray-600'}`}
                        aria-describedby="txn-desc"
                        aria-invalid={!!verificationError}
                    />
                     {verificationError ? (
                        <p className="text-xs text-red-400 mt-1 text-left">{verificationError}</p>
                    ) : (
                        <p id="txn-desc" className="text-xs text-gray-500 mt-1 text-left">This is required to confirm your payment.</p>
                    )}
                </div>

            </div>
            <div className="p-4 bg-gray-900/50 rounded-b-lg grid grid-cols-2 gap-4">
                 <button
                    type="button"
                    onClick={() => {
                        setSelectedPlan(null);
                        setTransactionId('');
                        setVerificationError(null);
                    }}
                    className="w-full flex justify-center py-3 px-4 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500"
                >
                    Back to Plans
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isConfirmDisabled}
                    className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 transition-all duration-200 ease-in-out active:scale-95 disabled:bg-gray-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                     {isVerifying ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Verifying...
                        </>
                    ) : (
                        'Confirm Upgrade'
                    )}
                </button>
            </div>
        </>
    );


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div
        className="bg-gray-800 text-gray-300 rounded-lg shadow-xl max-w-md w-full mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <div className="flex items-center gap-2">
                <StarIcon className="w-6 h-6 text-yellow-400" />
                <h2 id="payment-modal-title" className="text-xl font-semibold text-white">Upgrade to ChatVerse Pro</h2>
            </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            aria-label="Close payment modal"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
          </button>
        </div>
        
        {selectedPlan ? renderPaymentDetails() : renderPlanSelection()}

      </div>
    </div>
  );
};