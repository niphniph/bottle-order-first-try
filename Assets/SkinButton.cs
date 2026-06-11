using UnityEngine;
using UnityEngine.UI;

public class SkinButton : MonoBehaviour
{
    public string skinId;
    public Image previewImage;
    public Sprite skinPreview;

    private void Start()
    {
        previewImage.sprite = skinPreview;
    }

    public void OnClickSelect()
    {
        SkinManager.Instance.SelectSkin(skinId);
    }
}
