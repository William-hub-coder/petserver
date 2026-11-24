const app = getApp();

Page({
  data: {
    tasks: [],
    error: '',
  },
  onShow() {
    this.loadTasks();
  },
  loadTasks() {
    const base = app.globalData.apiBaseUrl;
    wx.request({
      url: `${base}/inspect/tasks`,
      success: (res) => {
        const data = (res.data && res.data.data) || [];
        this.setData({ tasks: data, error: '' });
      },
      fail: (err) => {
        this.setData({
          error: '无法连接网关，请用开发者工具关闭域名校验并启动后端',
          tasks: [
            {
              id: 'local',
              merchantAlias: '商户-本地占位',
              category: 'hospital',
              status: 'assigned',
            },
          ],
        });
        console.warn(err);
      },
    });
  },
});
