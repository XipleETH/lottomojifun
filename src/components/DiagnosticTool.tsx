import React, { useState, useEffect } from 'react';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { CONTRACT_ADDRESSES } from '../contracts/LottoMojiFun';

export const DiagnosticTool: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [rpcStatus, setRpcStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [contractStatus, setContractStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [blockNumber, setBlockNumber] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [contractAddress] = useState<string>(CONTRACT_ADDRESSES.LOTTO_MOJI_FUN);

  // Crear cliente público
  const publicClient = createPublicClient({
    chain: base,
    transport: http('https://base.publicnode.com')
  });

  // Comprobar RPC y contrato al cargar
  useEffect(() => {
    const checkConnection = async () => {
      // Comprobar RPC
      try {
        const block = await publicClient.getBlockNumber();
        setBlockNumber(block.toString());
        setRpcStatus('success');
      } catch (error) {
        setRpcStatus('error');
        setErrorMessage(`Error RPC: ${(error as Error).message}`);
      }

      // Comprobar contrato
      try {
        const code = await publicClient.getBytecode({ address: contractAddress as `0x${string}` });
        if (code && code !== '0x') {
          setContractStatus('success');
        } else {
          setContractStatus('error');
          setErrorMessage('Contrato no encontrado o no desplegado');
        }
      } catch (error) {
        setContractStatus('error');
        setErrorMessage(`Error contrato: ${(error as Error).message}`);
      }
    };

    checkConnection();
  }, []);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg"
      >
        Diagnóstico
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-md z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Herramienta de Diagnóstico</h3>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="mb-4">
        <p className="font-medium">Contrato: {contractAddress}</p>
        <p className="font-medium">Red: Base Mainnet</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center">
          <span className="mr-2">Estado RPC:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            rpcStatus === 'success' ? 'bg-green-100 text-green-800' : 
            rpcStatus === 'error' ? 'bg-red-100 text-red-800' : 
            'bg-yellow-100 text-yellow-800'
          }`}>
            {rpcStatus === 'success' ? `Conectado (Bloque #${blockNumber})` : 
             rpcStatus === 'error' ? 'Error' : 
             'Pendiente'}
          </span>
        </div>

        <div className="flex items-center">
          <span className="mr-2">Estado Contrato:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            contractStatus === 'success' ? 'bg-green-100 text-green-800' : 
            contractStatus === 'error' ? 'bg-red-100 text-red-800' : 
            'bg-yellow-100 text-yellow-800'
          }`}>
            {contractStatus === 'success' ? 'Desplegado' : 
             contractStatus === 'error' ? 'Error' : 
             'Pendiente'}
          </span>
        </div>

        {errorMessage && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-red-700 text-sm">{errorMessage}</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>Si tienes problemas, visita <a href="/diagnostico.html" target="_blank" className="text-blue-500 underline">la página de diagnóstico completa</a>.</p>
      </div>
    </div>
  );
}; 