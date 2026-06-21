<div id="tab-notes" class="tab-content">
    <h2>📒 Nhật ký trích xuất highlight</h2>
    
    <!-- View controls -->
    <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem; align-items:center;">
        <span style="font-weight:bold; color:#4d2d35;">Xem theo:</span>
        <button class="view-btn active" data-view="grid" style="background:#e3a6b2; color:white; border:none; padding:0.3rem 1rem; border-radius:4px; cursor:pointer;">📐 Lưới</button>
        <button class="view-btn" data-view="list" style="background:#f2dae0; color:#54333a; border:none; padding:0.3rem 1rem; border-radius:4px; cursor:pointer;">📋 Danh sách</button>
        <button class="view-btn" data-view="original" style="background:#f2dae0; color:#54333a; border:none; padding:0.3rem 1rem; border-radius:4px; cursor:pointer;">📖 Gốc</button>
        <button class="view-btn" data-view="detailed" style="background:#f2dae0; color:#54333a; border:none; padding:0.3rem 1rem; border-radius:4px; cursor:pointer;">📊 Chi tiết</button>
        
        <span style="margin-left:auto; font-weight:bold; color:#4d2d35;">Bulk:</span>
        <button id="selectAllNotes" style="background:#f2dae0; color:#54333a; border:none; padding:0.3rem 0.8rem; border-radius:4px; cursor:pointer;">✅ Chọn tất cả</button>
        <button id="deleteSelectedNotes" style="background:#bd4f60; color:white; border:none; padding:0.3rem 0.8rem; border-radius:4px; cursor:pointer;">🗑 Xóa (0)</button>
        <button id="exportNotesCSV" style="background:#4a7a6b; color:white; border:none; padding:0.3rem 0.8rem; border-radius:4px; cursor:pointer;">📥 Xuất CSV</button>
        <button id="groupByBlock" style="background:#7a5a6b; color:white; border:none; padding:0.3rem 0.8rem; border-radius:4px; cursor:pointer;">📂 Nhóm theo đoạn</button>
    </div>
    
    <div id="notesList"></div>
</div>
