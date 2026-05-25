import toast from 'react-hot-toast';

export function useToast() {
  return {
    success: (message: string) =>
      toast.success(message, {
        style: {
          borderRadius: '12px',
          background: 'rgba(30, 30, 30, 0.9)',
          color: '#fff',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        iconTheme: { primary: '#22c55e', secondary: '#fff' },
      }),
    error: (message: string) =>
      toast.error(message, {
        style: {
          borderRadius: '12px',
          background: 'rgba(30, 30, 30, 0.9)',
          color: '#fff',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        iconTheme: { primary: '#ef4444', secondary: '#fff' },
      }),
    info: (message: string) =>
      toast(message, {
        style: {
          borderRadius: '12px',
          background: 'rgba(30, 30, 30, 0.9)',
          color: '#fff',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      }),
    promise: toast.promise,
  };
}
