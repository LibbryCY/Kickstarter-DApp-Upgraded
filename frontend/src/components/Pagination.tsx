interface Props {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }
  
  export function Pagination({ currentPage, totalPages, onPageChange }: Props) {
    if (totalPages <= 1) return null;
  
    return (
      <div className="pagination">
        <button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
          ← Prev
        </button>
        <span className="pagination-info">
          Page {currentPage} of {totalPages}
        </span>
        <button disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
          Next →
        </button>
      </div>
    );
  }