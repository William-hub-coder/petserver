const app = getApp();

Page({
  data: {
    lat: '',
    lng: '',
    result: '',
  },
  doCheckIn() {
    const lat = 31.2304;
    const lng = 121.4737;
    this.setData({ lat, lng });
    wx.request({
      url: `${app.globalData.apiBaseUrl}/inspect/tasks/task_shell_1/check-in`,
      method: 'POST',
      data: { lat, lng },
      success: (res) => {
        const d = (res.data && res.data.data) || {};
        this.setData({
          result: `已签到 ${d.checkedInAt || ''}（BSSID=${d.bssidVerified}）`,
        });
      },
      fail: () => {
        this.setData({ result: '本地模拟签到成功（网关未连接）' });
      },
    });
  },
});
