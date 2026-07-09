import { RequestStatus } from '../../data/mockData';
interface StatusBadgeProps {
  status: RequestStatus | 'Not Found';
  className?: string;
}
export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const getStyles = () => {
    switch (status) {
      case 'Verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Revoked':
      case 'Tampered':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Rejected':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Pending':
      case 'Under Review':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Approved':
      case 'Anchored':
      case 'Available':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Not Found':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStyles()} ${className}`}>
      
      {status}
    </span>);

}