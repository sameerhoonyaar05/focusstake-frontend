import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../supabaseClient';

function PaymentPage({ user, task, setCurrentPage, setCurrentTask }) {
  const [utrInput, setUtrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const UPI_ID = '7880665918-2@ybl';
  const UPI_NAME = 'FocusStake';
  const AMOUNT = task?.stake_amount || 15;
  const upiUrl = `upi://pay?pa=${UPI_ID}&pn=${UPI_NAME}&am=${AMOUNT}&cu=INR&tn=FocusStake Task Stake`;

  const handleUtrSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (utrInput.length !== 12 || !/^\d+$/.test(utrInput)) {
        throw new Error('UTR 12 digits ka hona chahiye!');
      }
    const { error: updateError } = await supabase
  .from('payments')
  .update({ utr_from_user: utrInput })
  .eq('task_id', task.id);

if (updateError) {
  await supabase
    .from('payments')
    .insert([{
      task_id: task.id,
      user_id: user.id,
      utr_from_user: utrInput,
      status: 'pending',
    }]);
}
      

      setSubmitted(true);

      setTimeout(() => {
        setCurrentTask(task);
        setCurrentPage('timer');
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2">💳 Payment Karo</h1>
        <p className="text-gray-600 mb-6">
          Stake Amount: <span className="font-bold text-green-600 text-xl">₹{AMOUNT}</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          <div className="bg-gray-50 p-6 rounded-lg text-center">
            <h2 className="text-lg font-bold mb-4">📱 Step 1: QR Scan Karo</h2>

            <div className="bg-white p-4 rounded-lg inline-block mb-4 shadow border">
              <QRCodeCanvas
                value={upiUrl}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="bg-green-50 rounded-lg p-3 mb-3">
              <p className="text-xs text-gray-500 mb-1">UPI ID:</p>
              <p className="font-bold text-green-700 text-sm">{UPI_ID}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500 mb-1">Amount:</p>
              <p className="font-bold text-blue-700 text-2xl">₹{AMOUNT}</p>
            </div>

            <a
              href={upiUrl}
              className="block w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition text-center text-sm"
            >
              📲 UPI App Mein Kholo
            </a>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-bold mb-4">🔢 Step 2: UTR Enter Karo</h2>

            {!submitted ? (
              <>
                <form onSubmit={handleUtrSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      12-Digit UTR Number
                    </label>
                    <input
                      type="text"
                      placeholder="123456789012"
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      maxLength="12"
                      className="w-full px-4 py-3 border-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xl text-center tracking-widest"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      {utrInput.length}/12 digits
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || utrInput.length !== 12}
                    className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 transition disabled:opacity-50 text-lg"
                  >
                    {loading ? '⏳ Verifying...' : '✅ Submit UTR'}
                  </button>
                </form>

                <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
                  <p className="font-bold mb-1">📖 UTR kahan milega?</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-gray-700">
                    <li>QR scan karke payment karo</li>
                    <li>PhonePe/GPay/Paytm mein jao</li>
                    <li>Transaction history mein dekho</li>
                    <li>12-digit UTR copy karo</li>
                  </ol>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-green-600 mb-2">UTR Submit Ho Gaya!</h3>
                <p className="text-gray-600 text-sm">Timer page par ja raha hai...</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <p className="font-bold mb-1">⚠️ Important:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Pehle payment karo, phir UTR enter karo</li>
            <li>UTR verify hone ke baad timer shuru hoga</li>
            <li>Minimum stake: ₹15</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;